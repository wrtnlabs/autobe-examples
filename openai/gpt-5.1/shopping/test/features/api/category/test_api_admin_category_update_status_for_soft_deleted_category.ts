import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate that updating a deleted category is rejected.
 *
 * Business context:
 *
 * - Admins manage the global shopping mall category taxonomy.
 * - Once a category has been deleted from `shopping_mall_categories`, it should
 *   no longer be updatable.
 * - This test verifies that calling the update endpoint on a deleted category
 *   results in an error, ensuring lifecycle consistency.
 *
 * Flow:
 *
 * 1. Admin joins the platform and obtains an authorization token.
 * 2. Admin creates a new category via POST /shoppingMall/admin/categories.
 * 3. Admin deletes the category via DELETE
 *    /shoppingMall/admin/categories/{categoryId}.
 * 4. Admin attempts to update the same category via PUT
 *    /shoppingMall/admin/categories/{categoryId}.
 * 5. The update attempt must fail with some error, and the test only asserts that
 *    an error is thrown, not the specific status code.
 */
export async function test_api_admin_category_update_status_for_soft_deleted_category(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Admin creates a new category
  const createBody = typia.random<IShoppingMallCategory.ICreate>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 3. Admin deletes the category
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: category.id,
  });

  // 4. Attempt to update the deleted category and expect an error
  const updateBody = typia.random<IShoppingMallCategory.IUpdate>();
  await TestValidator.error(
    "update on deleted category must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.categories.update(connection, {
        categoryId: category.id,
        body: updateBody,
      });
    },
  );
}
