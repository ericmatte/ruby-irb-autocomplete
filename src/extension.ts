// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { ProcessEnvOptions, spawnSync } from "child_process";
import { join } from "path";

const extensionPath = vscode.extensions.getExtension("ericmatte.ruby-irb-autocomplete")!.extensionPath;
const script = join(extensionPath, "./src/irb_suggest.rb");

const executeSync = (cmd: string, args?: string[], options?: ProcessEnvOptions): string => {
  console.log("cmd:", `${cmd} ${(args || []).join(" ")}`);
  const spawned = spawnSync(cmd, args, options);
  console.log("done:", spawned.status);

  if (spawned.error) {
    throw spawned.error;
  }

  return spawned.stdout.toString();
};

const getIrbSuggestions = (input: string): string[] => {
  const cursor = "irb_output=";
  try {
    const output = executeSync(`bundle`, [`exec`, `spring`, `rails`, `r`, script], {
      env: { ...process.env, cursor, input },
    });

    const parsedOutput = output.substring(output.indexOf(cursor) + cursor.length, output.length - 1);
    return JSON.parse(parsedOutput);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getInput = (line: string) => {
  let input = line.substring(0, line.lastIndexOf("."));
  if (line.includes(".")) {
    input += ".";
  }
  return input;
};

export function activate(context: vscode.ExtensionContext) {
  let lastSuggestion: { input: string; suggestions: vscode.CompletionItem[] } | undefined;

  const suggestionsToCompletionItems = (input: string, suggestions: string[]): vscode.CompletionItem[] => {
    try {
      const completionItems: vscode.CompletionItem[] = [];

      for (let i = 0; i < suggestions.length; i++) {
        if (!!suggestions[i]) {
          const value = suggestions[i].split(".").pop();
          if (value) {
            completionItems.push(new vscode.CompletionItem(value, vscode.CompletionItemKind.Method));
          }
        }
      }

      console.log(completionItems.map(item => item.label));
      lastSuggestion = { input, suggestions: completionItems };
      return completionItems;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  let rubySuggest = vscode.languages.registerCompletionItemProvider("ruby", {
    provideCompletionItems: (document, position, token, context) => {
      const line = document.lineAt(position).text.trim();
      let input = getInput(line);

      console.log(`Suggesting for '${input}'...`);

      if (lastSuggestion && lastSuggestion.input === input) {
        return lastSuggestion.suggestions;
      }

      const suggestions = getIrbSuggestions(input);
      return suggestionsToCompletionItems(input, suggestions);
    },
  });

  context.subscriptions.push(rubySuggest);
}

// this method is called when your extension is deactivated
export function deactivate() {
  // executeSync("bundle", [`exec`, `spring`, `stop`]);
}
