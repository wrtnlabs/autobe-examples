import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

/**
 * Verify that deleting a category localization is rejected when the caller is
 * not authenticated as an admin.
 *
 * Business context: Category localizations are maintained by administrators
 * through admin-only endpoints. Deleting a localization should never be
 * possible from an unauthenticated context. Even if an admin has previously
 * joined and created catalog data, an HTTP client lacking the Authorization
 * token must be blocked by the authorization layer and must not be able to
 * perform destructive operations.
 *
 * Test steps:
 *
 * 1. Join as an admin via POST /auth/admin/join to set up an authenticated admin
 *    context and token.
 * 2. Using the authenticated admin connection, create a new category with POST
 *    /shoppingMall/admin/categories.
 * 3. On that category, create a localization via POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations and capture the
 *    categoryId and locale.
 * 4. Build an unauthenticated connection object by cloning the incoming connection
 *    but overriding headers with an empty object, so that there is no
 *    Authorization header.
 * 5. Call DELETE
 *    /shoppingMall/admin/categories/{categoryId}/localizations/{locale} through
 *    api.functional.shoppingMall.admin.categories.localizations.erase using the
 *    unauthenticated connection.
 * 6. Assert that the call fails with an HTTP 401 or 403 using
 *    TestValidator.httpError, proving that admin authentication is enforced for
 *    this destructive operation.
 * 7. Since we don't have a read endpoint in the provided SDK to re-fetch the
 *    localization, we rely on the failed erase call as evidence that the
 *    existing localization has not been deleted.
 */
export async function test_api_admin_delete_category_localization_unauthorized(
  connection: api.IConnection,
) {
  // 1. Join as an admin for data setup
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category as the authenticated admin
  const categoryCreateBody = {
    parent_id: null,
    slug: `test-slug-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Unauthorized deletion test category",
    description_en: "Category used to verify admin-only localization deletion.",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Create a localization for that category
  const localeValue = "en-US";
  const localizationCreateBody = {
    locale: localeValue,
    name: "Unauthorized deletion test localization",
    description: "Localization to be protected from unauthenticated deletes.",
    seo_title: "Unauthorized delete guard",
    seo_description: "Verifies that DELETE is admin-only.",
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const localization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(localization);

  // 4. Build an unauthenticated connection by cloning without headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5 & 6. Attempt to delete the localization without authentication and expect 401/403
  await TestValidator.httpError(
    "unauthenticated delete localization must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.categories.localizations.erase(
        unauthenticatedConnection,
        {
          categoryId: category.id,
          locale: localization.locale,
        },
      );
    },
  );
}
