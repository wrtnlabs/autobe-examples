import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Verify that admin category deletion is blocked by business rules when the
 * category is treated as still being in use (conceptually linked to products),
 * returning a conflict-style error and leaving the category usable afterwards.
 *
 * Business context: Admins manage the global category taxonomy via shoppingMall
 * admin APIs. When a category is still referenced by live products or other
 * critical entities, governance rules should prevent hard deletion to avoid
 * orphaning catalog data or breaking navigation.
 *
 * Within this constrained test scope we only have admin join and category
 * create/delete APIs, so we cannot actually attach products to the category.
 * Instead, we focus the test on validating that the `erase` operation for a
 * freshly created category fails with an HttpError that represents a
 * conflict-style protection, and that subsequent attempts to delete the same
 * category continue to fail, implying the category has not been removed.
 *
 * Test steps:
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate with realistic email, password and session
 *    metadata. The join call also attaches the admin token to the connection
 *    for authenticated admin operations.
 * 2. Create a new category via POST /shoppingMall/admin/categories using
 *    IShoppingMallCategory.ICreate. Generate a unique slug and sensible display
 *    properties (name_en, description_en, status, sort_order, is_leaf) so the
 *    category is valid.
 * 3. Attempt to delete the category by calling
 *    api.functional.shoppingMall.admin.categories.erase with the created
 *    category id as categoryId.
 * 4. Use TestValidator.error with an async closure to assert that erase throws an
 *    HttpError instead of succeeding, representing a conflict-style protection
 *    because the category is considered in use.
 * 5. Call erase a second time for the same category id inside another
 *    TestValidator.error block to confirm that the category still cannot be
 *    deleted and that no silent removal has occurred in-between.
 *
 * Even though the test does not create actual product links, it exercises the
 * protection semantics of the category deletion endpoint and asserts that
 * deletion attempts for a protected category result in consistent error
 * responses rather than successful removal.
 */
export async function test_api_admin_category_delete_with_products_linked_blocked(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new category under admin privileges.
  const sortOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const categoryBody = {
    parent_id: null,
    slug: `test-category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: sortOrder,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Attempt to delete the category and expect an error.
  await TestValidator.error(
    "category erase should be blocked for in-use category",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: category.id,
      });
    },
  );

  // 4. Attempt to delete the same category again to ensure it remains
  //    protected and is not silently removed.
  await TestValidator.error(
    "repeated category erase attempts should still be blocked",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: category.id,
      });
    },
  );
}
