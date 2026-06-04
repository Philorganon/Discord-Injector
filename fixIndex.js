const fs = require('fs');

const filePath = './index.js';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Find the end of the restore command: line that ends with `});` and is part of the restore command.
// We know from earlier that line 976 (0-indexed 975) is the restore command's closing.
// Let's find it by looking for the restore command's action closing.

// We'll find the index of the line that contains `});` and is after the restore command action.
// We can search for the restore command by looking for `program.command('restore')` and then find the matching closing.

// But for simplicity, we'll use the line numbers we know from the original file, but they may have shifted.
// Let's search for the restore command's action closing by looking for the pattern that ends the restore command.

// We'll find the index of the line that has `});` and is followed by a blank line and then the STATUS COMMENT.

let restoreEndIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '});' && lines[i+1].trim() === '' && lines[i+2].includes('// ==================== STATUS COMMAND ====================')) {
        restoreEndIndex = i;
        break;
    }
}
console.log('Restore end index:', restoreEndIndex);

// Find the start of the backup commands block: the line with '// ==================== BACKUP COMMANDS ===================='
let backupStartIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// ==================== BACKUP COMMANDS ====================')) {
        backupStartIndex = i;
        break;
    }
}
console.log('Backup start index:', backupStartIndex);

// Find the end of the backup commands block: we look for the line that ends with `);` and is followed by a blank line and then the status command.
// The status command starts with `program.command('status')`.
let backupEndIndex = -1;
for (let i = backupStartIndex; i < lines.length; i++) {
    if (lines[i].trim() === ');' && lines[i+1].trim() === '' && lines[i+2].includes('program.command(\'status\')')) {
        backupEndIndex = i;
        break;
    }
}
console.log('Backup end index:', backupEndIndex);

// If we found the marks, we can extract the block and remove it from its current position.
if (restoreEndIndex !== -1 && backupStartIndex !== -1 && backupEndIndex !== -1) {
    // Extract the backup commands block (from backupStartIndex to backupEndIndex inclusive)
    const backupBlock = lines.slice(backupStartIndex, backupEndIndex + 1);
    // Remove the block from its current position
    lines.splice(backupStartIndex, backupEndIndex - backupStartIndex + 1);
    // Insert the block after the restoreEndIndex
    lines.splice(restoreEndIndex + 1, 0, ...backupBlock);
    console.log('Moved backup commands block.');
} else {
    console.log('Could not find backup commands block to move.');
}

// Now, insert the runBackupManagement function after the runSounds function and before the PROGRAM SETUP comment.
// Find the end of the runSounds function: look for the closing brace of the runSounds function.
// We know the runSounds function ends with a closing brace and then a blank line and then the PROGRAM SETUP comment.

let runSoundsEndIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '}' && lines[i+1].trim() === '' && lines[i+2].includes('// ==================== PROGRAM SETUP ====================')) {
        runSoundsEndIndex = i;
        break;
    }
}
console.log('RunSounds end index:', runSoundsEndIndex);

if (runSoundsEndIndex !== -1) {
    const runBackupManagementFunction = `
/**
 * Menu action: Backup Management
 */
async function runBackupManagement() {
    console.log(chalk.cyan('\nBackup Management:\n'));

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Choose action:',
        choices: [
            { name: 'List all backups', value: 'list' },
            { name: 'Restore a backup', value: 'restore' },
            { name: 'Clean old backups', value: 'clean' },
            { name: 'Cancel', value: 'cancel' }
        ]
    }]);

    if (action === 'list') {
        const backups = await listBackups();
        if (backups.length === 0) {
            console.log(chalk.gray('No backups found.'));
        } else {
            for (const b of backups) {
                console.log(chalk.white(\`  \${b.filename}\`));
                console.log(chalk.gray(\`    Size: \${(b.size/1024).toFixed(1)} KB  |  Date: \${b.date.toLocaleString()}\`));
            }
        }
    } else if (action === 'restore') {
        const backups = await listBackups();
        if (backups.length === 0) {
            console.log(chalk.gray('No backups found.'));
            return;
        }

        const { backupChoice } = await inquirer.prompt([{
            type: 'list',
            name: 'backupChoice',
            message: 'Choose a backup to restore:',
            choices: backups.map(b => ({
                name: \`\${b.filename} (\${(b.size/1024).toFixed(1)} KB, \${b.date.toLocaleString()})\`,
                value: b.filename
            }))
        }]);

        spinner.start('Restoring backup...');
        const result = await restoreBackup(backupChoice);
        if (result.success) {
            spinner.succeed(chalk.green('Backup restored!'));
            console.log(chalk.gray(\`Restored to: \${result.path}\`));
        } else {
            spinner.fail(chalk.red(\`Failed: \${result.error}\`));
        }
    } else if (action === 'clean') {
        const { keepNum } = await inquirer.prompt([{
            type: 'input',
            name: 'keepNum',
            message: 'How many backups to keep?',
            default: '10',
            validate: (input) => !isNaN(parseInt(input)) || 'Enter a valid number'
        }]);

        spinner.start('Cleaning old backups...');
        const result = await cleanOldBackups(parseInt(keepNum, 10));
        if (result.error) {
            spinner.fail(chalk.red(\`Error: \${result.error}\`));
        } else {
            spinner.succeed(chalk.green(\`Cleaned! Deleted \${result.deleted}, kept \${result.kept}\`));
        }
    }
}`;
    // Insert the function after the runSoundsEndIndex (i.e., at index runSoundsEndIndex+1)
    lines.splice(runSoundsEndIndex + 1, 0, runBackupManagementFunction);
    console.log('Inserted runBackupManagement function.');
} else {
    console.log('Could not find runSounds function end.');
}

// Now fix the main menu.
// We need to:
// 1. Change the exit line (option 0) to option 11.
// 2. Insert a new exit line after the backup management line.
// 3. Update the validation in the prompt: change 'Select option (0-9):' to 'Select option (0-11):'
// 4. Update the validation function: change `num > 10` to `num > 11`
// 5. Add switch case for 11 after case 10 break.

// We'll do these by scanning the lines.

// 1. Change the exit line (option 0) to option 11.
// We look for the line that contains `  0.  Exit                             `
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('  0.  Exit                             ')) {
        lines[i] = lines[i].replace('  0.  Exit                             ', '  11. Backup Management                ');
        break;
    }
}
// 2. Insert a new exit line after the backup management line (which is now the line we just changed).
// We look for the line that now contains `  11. Backup Management                `
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('  11. Backup Management                ')) {
        // Insert a new line after this line with the exit option.
        lines.splice(i + 1, 0, lines[i].replace('  11. Backup Management                ', '  0.  Exit                             '));
        break;
    }
}
// 3. Update the validation in the prompt: change 'Select option (0-9):' to 'Select option (0-11):'
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Select option (0-9):')) {
        lines[i] = lines[i].replace('Select option (0-9):', 'Select option (0-11):');
        break;
    }
}
// 4. Update the validation function: change `num > 10` to `num > 11`
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('num > 10')) {
        lines[i] = lines[i].replace('num > 10', 'num > 11');
        break;
    }
}
// 5. Add switch case for 11 after case 10 break.
// We look for the line that contains `break;` after case 10.
// We'll look for the pattern: `case 10:` then later `break;` and insert after that break.

let case10BreakIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('case 10:')) {
        // Look for the next break statement after this.
        for (let j = i; j < lines.length; j++) {
            if (lines[j].trim() === 'break;') {
                case10BreakIndex = j;
                break;
            }
        }
        break;
    }
}
if (case10BreakIndex !== -1) {
    // Insert after the break line.
    lines.splice(case10BreakIndex + 1, 0, '        case 11:', '            await runBackupManagement();', '            break;');
    console.log('Added case 11 to switch.');
} else {
    console.log('Could not find case 10 break.');
}

// Write the file back.
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Index.js fixed successfully.');