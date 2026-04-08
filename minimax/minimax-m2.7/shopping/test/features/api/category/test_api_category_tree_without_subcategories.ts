import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_category_tree_without_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Call category tree endpoint
  const tree: IEcommerceMallCategory.ITree =
    await api.functional.ecommerceMall.guest.categories.tree(guestConnection);
  typia.assert(tree);
  // 3. Validate response structure
  TestValidator.predicate("tree is defined", !!tree);
  TestValidator.predicate("tree has id", !!tree.id);
  TestValidator.predicate("tree has name", !!tree.name);
  TestValidator.predicate("tree has children array", !!tree.children);
  TestValidator.equals(
    "children is an array",
    Array.isArray(tree.children),
    true,
  );
  // 4. Verify categories without subcategories have empty children arrays
  // Recursively validate the tree structure
  const validateNode = (
    node: IEcommerceMallCategory.ITree,
    path: string,
  ): void => {
    // Children must be an array (empty for terminal nodes)
    TestValidator.equals(
      `${path}.children is array`,
      Array.isArray(node.children),
      true,
    );
    // If no children, children should be empty array
    if (node.children.length === 0) {
      TestValidator.equals(
        `${path} has empty children array when no subcategories`,
        node.children,
        [],
      );
    }
    // Validate each child recursively
    node.children.forEach((child, index) => {
      validateNode(child, `${path}.children[${index}]`);
    });
  };
  validateNode(tree, "root");
  // 5. Verify the structure has all required fields for each node
  const validateNodeStructure = (
    node: IEcommerceMallCategory.ITree,
    path: string,
  ): void => {
    TestValidator.predicate(
      `${path} has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        node.id,
      ),
    );
    TestValidator.predicate(
      `${path} has non-empty name`,
      !!node.name && node.name.length > 0,
    );
    TestValidator.equals(
      `${path}.children is array`,
      Array.isArray(node.children),
      true,
    );
    node.children.forEach((child, index) => {
      validateNodeStructure(child, `${path}.children[${index}]`);
    });
  };
  validateNodeStructure(tree, "root");
}
