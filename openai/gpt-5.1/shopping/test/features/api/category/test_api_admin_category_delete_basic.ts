import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Basic admin happy-path deletion test for shopping mall categories.
 *
 * This test validates that:
 *
 * 1. An administrator can join (register) and obtain an authenticated context.
 * 2. The authenticated admin can create a new category in the taxonomy.
 * 3. The admin can delete that category via DELETE
 *    /shoppingMall/admin/categories/{categoryId}.
 * 4. Subsequent delete attempts on the same id result in an error, confirming that
 *    already-deleted categories cannot be deleted again and that the backend
 *    signals this as a failure.
 *
 * Business context:
 *
 * - Categories drive global catalog navigation, so deletion is restricted to
 *   admins and must be explicit and reliable.
 * - A successful delete should complete without returning a body (void in the
 *   SDK), and attempting to delete a non-existent or already-deleted category
 *   must fail.
 *
 * Steps:
 *
 * 1. Admin registration via POST /auth/admin/join using random, valid
 *    IShoppingMallAdminJoin.ICreate data.
 * 2. Category creation via POST /shoppingMall/admin/categories using a
 *    deterministic IShoppingMallCategory.ICreate payload.
 * 3. First DELETE call to /shoppingMall/admin/categories/{categoryId} for the
 *    newly created category; expect success (no thrown error).
 * 4. Second DELETE call for the same id wrapped in TestValidator.error to verify
 *    that an error is thrown.
 */
export async function test_api_admin_category_delete_basic(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a new category to be deleted later
  const categorySlug = RandomGenerator.alphaNumeric(12);
  const categoryBody = {
    parent_id: null,
    slug: categorySlug,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category should preserve slug",
    createdCategory.slug,
    categoryBody.slug,
  );

  // 3. First deletion should succeed without error
  let firstDeleteSucceeded = false;
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: createdCategory.id,
  });
  firstDeleteSucceeded = true;

  TestValidator.predicate(
    "first delete call should complete without throwing",
    firstDeleteSucceeded,
  );

  // 4. Second deletion on the same id should fail
  await TestValidator.error(
    "second delete on same category id should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: createdCategory.id,
      });
    },
  );
}
