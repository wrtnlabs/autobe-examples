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

export async function test_api_category_tree_public_retrieval_with_parent_and_child_categories(
  connection: api.IConnection,
) {
  // 1. Arrange: create an admin and authenticate
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Arrange: create a root (parent) category
  const parentSlug = `parent-${RandomGenerator.alphaNumeric(8)}`;
  const parentSortOrder = typia.random<number & tags.Type<"int32">>();

  const parentCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: parentSlug,
        name_en: RandomGenerator.name(),
        description_en: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        sort_order: parentSortOrder,
        is_leaf: false,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);

  // 3. Arrange: create two child categories under the parent with different sort_order
  const childASortOrder = 5 as number & tags.Type<"int32">;
  const childBSortOrder = 20 as number & tags.Type<"int32">;

  const childACategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        slug: `child-a-${RandomGenerator.alphaNumeric(8)}`,
        name_en: RandomGenerator.name(),
        description_en: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        sort_order: childASortOrder,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childACategory);

  const childBCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: parentCategory.id,
        slug: `child-b-${RandomGenerator.alphaNumeric(8)}`,
        name_en: RandomGenerator.name(),
        description_en: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        sort_order: childBSortOrder,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(childBCategory);

  // 4. Act: call the public category tree endpoint without auth headers
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.categories.tree.index(publicConnection);
  typia.assert(tree);

  // 5. Assert: locate the parent node in roots
  const parentNodeMaybe = tree.roots.find(
    (node) => node.id === parentCategory.id,
  );

  TestValidator.predicate(
    "parent node exists in tree roots",
    parentNodeMaybe !== undefined,
  );

  const parentNode = typia.assert<IShoppingMallCategoryTreeNode>(
    parentNodeMaybe!,
  );

  TestValidator.equals(
    "parent node id matches created parent category",
    parentNode.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent node slug matches created parent category",
    parentNode.slug,
    parentCategory.slug,
  );
  TestValidator.equals(
    "parent node status matches created parent category",
    parentNode.status,
    parentCategory.status,
  );
  TestValidator.predicate(
    "parent node is non-leaf as created",
    parentNode.is_leaf === parentCategory.is_leaf,
  );

  // 6. Assert: parent has children including both created child categories
  TestValidator.predicate(
    "parent node has at least two children",
    parentNode.children.length >= 2,
  );

  const childNodeMaybeA = parentNode.children.find(
    (c) => c.id === childACategory.id,
  );
  const childNodeMaybeB = parentNode.children.find(
    (c) => c.id === childBCategory.id,
  );

  TestValidator.predicate(
    "child A node exists under parent",
    childNodeMaybeA !== undefined,
  );
  TestValidator.predicate(
    "child B node exists under parent",
    childNodeMaybeB !== undefined,
  );

  const childNodeA = typia.assert<IShoppingMallCategoryTreeNode>(
    childNodeMaybeA!,
  );
  const childNodeB = typia.assert<IShoppingMallCategoryTreeNode>(
    childNodeMaybeB!,
  );

  TestValidator.equals(
    "child A node id matches created child A category",
    childNodeA.id,
    childACategory.id,
  );
  TestValidator.equals(
    "child B node id matches created child B category",
    childNodeB.id,
    childBCategory.id,
  );

  TestValidator.equals(
    "child A node slug matches created child A category",
    childNodeA.slug,
    childACategory.slug,
  );
  TestValidator.equals(
    "child B node slug matches created child B category",
    childNodeB.slug,
    childBCategory.slug,
  );

  TestValidator.predicate(
    "child A node is leaf as created",
    childNodeA.is_leaf === childACategory.is_leaf,
  );
  TestValidator.predicate(
    "child B node is leaf as created",
    childNodeB.is_leaf === childBCategory.is_leaf,
  );

  // 7. Assert: children list contains exactly our two children when filtered, and order respects sort_order
  const childrenOfParent = parentNode.children.filter(
    (c) => c.id === childACategory.id || c.id === childBCategory.id,
  );

  TestValidator.equals(
    "parent node has exactly the two created children when filtered by ids",
    childrenOfParent.length,
    2,
  );

  // Check global sort_order non-decreasing across all children
  TestValidator.predicate(
    "children are sorted by sort_order ascending globally",
    parentNode.children.every(
      (c, index, arr) =>
        index === 0 || arr[index - 1].sort_order <= c.sort_order,
    ),
  );

  // Check relative ordering of our two children by their sort_order
  const indexA = parentNode.children.findIndex(
    (c) => c.id === childACategory.id,
  );
  const indexB = parentNode.children.findIndex(
    (c) => c.id === childBCategory.id,
  );

  TestValidator.predicate(
    "both child A and child B exist in parent children for ordering check",
    indexA !== -1 && indexB !== -1,
  );

  TestValidator.predicate(
    "child A appears before child B when its sort_order is smaller",
    childACategory.sort_order <= childBCategory.sort_order
      ? indexA < indexB
      : indexB < indexA,
  );
}
