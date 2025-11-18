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

export async function test_api_category_tree_public_retrieval_with_single_root_category(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to obtain authorization context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Intentionally omit ip to exercise optionality (it can be undefined).
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a single active root category.
  const slug = `root-${RandomGenerator.alphabets(8)}`;
  const nameEn = `Root Category ${RandomGenerator.alphabets(5)}`;

  const categoryCreateBody = {
    parent_id: null,
    slug,
    name_en: nameEn,
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // Basic business validations on created category.
  TestValidator.equals(
    "created category should be a root (parent_id null)",
    createdCategory.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "created category should be marked as leaf",
    createdCategory.is_leaf,
    true,
  );
  TestValidator.equals(
    "created category status should be active",
    createdCategory.status,
    "active",
  );
  TestValidator.equals(
    "created category slug should match input",
    createdCategory.slug,
    slug,
  );
  TestValidator.equals(
    "created category name_en should match input",
    createdCategory.name_en,
    nameEn,
  );

  // 3. Public retrieval of category tree.
  const tree =
    await api.functional.shoppingMall.categories.tree.index(connection);
  typia.assert<IShoppingMallCategoryTree>(tree);

  // Ensure roots array has at least one node.
  TestValidator.predicate(
    "category tree should contain at least one root node",
    tree.roots.length > 0,
  );

  // 4. Locate the created category within the roots.
  const foundRoot = tree.roots.find(
    (node: IShoppingMallCategoryTreeNode) =>
      node.id === createdCategory.id || node.slug === createdCategory.slug,
  );

  TestValidator.predicate(
    "created root category must be present in category tree roots",
    foundRoot !== undefined,
  );

  if (!foundRoot) return; // TypeScript narrowing; if assertion fails, test will have thrown already.

  // 5. Verify fields of the located node.
  TestValidator.equals(
    "tree node id should equal created category id",
    foundRoot.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "tree node slug should equal created category slug",
    foundRoot.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "tree node name_en should equal created category name_en",
    foundRoot.name_en,
    createdCategory.name_en,
  );
  TestValidator.equals(
    "tree node status should equal created category status",
    foundRoot.status,
    createdCategory.status,
  );
  TestValidator.equals(
    "tree node sort_order should equal created category sort_order",
    foundRoot.sort_order,
    createdCategory.sort_order,
  );
  TestValidator.equals(
    "tree node is_leaf should be true",
    foundRoot.is_leaf,
    true,
  );

  // children must be an empty array for a leaf root node.
  TestValidator.equals(
    "leaf root node should have empty children array",
    foundRoot.children.length,
    0,
  );
}
