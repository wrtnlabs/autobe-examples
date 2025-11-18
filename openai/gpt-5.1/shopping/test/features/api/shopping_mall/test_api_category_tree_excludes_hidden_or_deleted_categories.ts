import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCategoryTreeNode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTreeNode";

/**
 * Validate that hidden/deprecated categories are excluded from public category
 * tree.
 *
 * Business goal:
 *
 * - The public category tree (/shoppingMall/categories/tree) must only expose
 *   categories that are considered visible for navigation.
 * - Categories that are administratively created with a hidden-like status should
 *   not appear, while their visible siblings should.
 *
 * Scenario implemented with available APIs:
 *
 * 1. Admin joins via POST /auth/admin/join to obtain an authenticated
 *    administrator context.
 * 2. Admin creates two root categories via POST /shoppingMall/admin/categories:
 *
 *    - VisibleRoot: status = "active"
 *    - HiddenRoot: status = "hidden" (treated as non-visible)
 * 3. Client calls GET /shoppingMall/categories/tree (no extra auth changes
 *    required because API is public) to obtain IShoppingMallCategoryTree.
 * 4. Traverse tree.roots and their descendants to collect all category node ids.
 * 5. Assert:
 *
 *    - VisibleRoot.id is present in the tree.
 *    - HiddenRoot.id is NOT present in the tree.
 * 6. Additionally, validate that the visible node’s basic properties (slug,
 *    name_en, status, sort_order, is_leaf) match the category created via admin
 *    API to ensure consistency between admin write model and public read
 *    model.
 */
export async function test_api_category_tree_excludes_hidden_or_deleted_categories(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two root categories with different visibility statuses
  const visibleCategoryBody = {
    parent_id: null,
    slug: `visible-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const hiddenCategoryBody = {
    parent_id: null,
    slug: `hidden-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "hidden",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const visibleCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: visibleCategoryBody,
    });
  typia.assert(visibleCategory);

  const hiddenCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: hiddenCategoryBody,
    });
  typia.assert(hiddenCategory);

  // Sanity check: ensure ids differ
  TestValidator.notEquals(
    "visible and hidden category ids must differ",
    visibleCategory.id,
    hiddenCategory.id,
  );

  // 3. Fetch public category tree
  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.categories.tree.index(connection);
  typia.assert(tree);

  // Helper to flatten tree nodes into a list
  const flatten = (
    nodes: IShoppingMallCategoryTreeNode[],
  ): IShoppingMallCategoryTreeNode[] => {
    const result: IShoppingMallCategoryTreeNode[] = [];
    const stack: IShoppingMallCategoryTreeNode[] = [...nodes];
    while (stack.length > 0) {
      const node = stack.pop() as IShoppingMallCategoryTreeNode;
      result.push(node);
      if (node.children.length > 0) {
        for (const child of node.children) stack.push(child);
      }
    }
    return result;
  };

  const allNodes: IShoppingMallCategoryTreeNode[] = flatten(tree.roots);

  // 4. Validate visible category is present
  const visibleNode = allNodes.find((node) => node.id === visibleCategory.id);

  TestValidator.predicate(
    "visible root category must appear in public category tree",
    () => visibleNode !== undefined,
  );

  if (visibleNode !== undefined) {
    // Validate key fields match
    TestValidator.equals(
      "visible node slug must match created category",
      visibleNode.slug,
      visibleCategory.slug,
    );
    TestValidator.equals(
      "visible node name_en must match created category",
      visibleNode.name_en,
      visibleCategory.name_en,
    );
    TestValidator.equals(
      "visible node status must match created category status",
      visibleNode.status,
      visibleCategory.status,
    );
    TestValidator.equals(
      "visible node sort_order must match created category sort_order",
      visibleNode.sort_order,
      visibleCategory.sort_order,
    );
    TestValidator.equals(
      "visible node is_leaf must match created category is_leaf",
      visibleNode.is_leaf,
      visibleCategory.is_leaf,
    );
  }

  // 5. Validate hidden category is excluded from tree
  const hiddenNode = allNodes.find((node) => node.id === hiddenCategory.id);

  TestValidator.predicate(
    "hidden root category must NOT appear in public category tree",
    () => hiddenNode === undefined,
  );
}
