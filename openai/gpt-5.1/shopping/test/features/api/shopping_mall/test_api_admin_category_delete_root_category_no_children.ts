import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Delete a root shopping mall category with no children.
 *
 * Business goal
 *
 * - Ensure that an unused top-level taxonomy node can be hard-deleted by an
 *   authenticated admin and that subsequent delete attempts fail because the
 *   record no longer exists.
 *
 * Scenario
 *
 * 1. Admin joins via POST /auth/admin/join, which both creates the admin account
 *    and sets the Authorization header on the shared connection.
 * 2. Using the authenticated admin connection, create a new root category R with
 *    parent_id null using POST /shoppingMall/admin/categories.
 * 3. Call DELETE /shoppingMall/admin/categories/{categoryId} for R.id and expect
 *    it to succeed without error.
 * 4. Attempt to delete the same category again and expect an error, proving the
 *    category was removed.
 *
 * Note: the SDK erase() call returns void, so we validate behavior by absence
 * of error for the first call and presence of an error on the second call,
 * without asserting specific HTTP status codes.
 */
export async function test_api_admin_category_delete_root_category_no_children(
  connection: api.IConnection,
) {
  // 1. Admin join: create an administrator and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new root category with no children (parent_id omitted/null)
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: 1 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // Basic sanity checks on the created entity
  TestValidator.equals(
    "created category should be root (parent_id null)",
    createdCategory.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "created category slug matches request",
    createdCategory.slug,
    createCategoryBody.slug,
  );

  // 3. First deletion should succeed without throwing
  await api.functional.shoppingMall.admin.categories.erase(connection, {
    categoryId: createdCategory.id,
  });

  // 4. Second deletion of same id must fail
  await TestValidator.error(
    "second delete of same category should fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.erase(connection, {
        categoryId: createdCategory.id,
      });
    },
  );
}
