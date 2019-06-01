import { SyntaxNode, Tree } from "web-tree-sitter";
import {
  IConnection,
  Location,
  LocationLink,
  Position,
  Range,
  TextDocumentPositionParams,
} from "vscode-languageserver";
import { IForest } from "../forest";
import { IImports } from "../imports";
import { NodeType, TreeUtils } from "../util/treeUtils";

export class DefinitionProvider {
  constructor(
    private connection: IConnection,
    private forest: IForest,
    private imports: IImports,
  ) {
    this.connection.onDefinition(this.handleDefinitionRequest);
  }

  protected handleDefinitionRequest = async (
    param: TextDocumentPositionParams,
  ): Promise<Location | Location[] | LocationLink[] | null | undefined> => {
    const tree: Tree | undefined = this.forest.getTree(param.textDocument.uri);

    if (tree) {
      const nodeAtPosition = tree.rootNode.namedDescendantForPosition({
        column: param.position.character,
        row: param.position.line,
      });

      const definitionNode = TreeUtils.findDefinitonNodeByReferencingNode(
        nodeAtPosition,
        param.textDocument.uri,
        tree,
        this.imports,
      );

      if (definitionNode) {
        return this.createLocationFromDefinition(
          definitionNode.node,
          definitionNode.uri,
        );
      }
    }
  };

  private createLocationFromDefinition(
    definitionNode: SyntaxNode | undefined,
    uri: string,
  ): Location | undefined {
    if (definitionNode) {
      return Location.create(
        uri,
        Range.create(
          Position.create(
            definitionNode.startPosition.row,
            definitionNode.startPosition.column,
          ),
          Position.create(
            definitionNode.endPosition.row,
            definitionNode.endPosition.column,
          ),
        ),
      );
    }
  }
}
