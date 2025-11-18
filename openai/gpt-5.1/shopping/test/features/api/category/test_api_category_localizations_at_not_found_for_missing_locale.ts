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
 * Verify not-found behavior for missing category localization locale.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. As admin, create a category with POST /shoppingMall/admin/categories.
 * 3. Create exactly one localization for that category with locale "en-US" using
 *    POST /shoppingMall/admin/categories/{categoryId}/localizations.
 * 4. From a public (unauthenticated) client connection, request GET
 *    /shoppingMall/categories/{categoryId}/localizations/ko-KR where "ko-KR"
 *    has not been localized.
 * 5. Assert that this GET call results in a not-found style HTTP error (404) for
 *    the missing locale while the category itself still exists.
 * 6. Call GET again for the existing locale "en-US" and assert success, confirming
 *    that the error condition is specific to the missing locale.
 */
export async function test_api_category_localizations_at_not_found_for_missing_locale(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context and initial token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category as admin
  const categoryBody = {
    parent_id: null,
    slug: `e2e-test-category-${Date.now().toString()}`,
    name_en: "E2E Test Category",
    description_en: "Category used for missing locale localization test",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Create a single localization for locale en-US
  const existingLocale = "en-US";
  const missingLocale = "ko-KR";

  const localizationCreateBody = {
    locale: existingLocale,
    name: "E2E Category Name EN",
    description: "English localization for E2E category",
    seo_title: "E2E EN Category SEO Title",
    seo_description: "E2E EN Category SEO Description",
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const createdLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(createdLocalization);

  // 4. From a public client, request a localization for a missing locale
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "missing locale localization should yield not-found style error",
    404,
    async () => {
      await api.functional.shoppingMall.categories.localizations.at(
        publicConnection,
        {
          categoryId: category.id,
          locale: missingLocale,
        },
      );
    },
  );

  // 5. Ensure fetching the existing locale still succeeds
  const fetchedExisting: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.categories.localizations.at(
      publicConnection,
      {
        categoryId: category.id,
        locale: existingLocale,
      },
    );
  typia.assert(fetchedExisting);

  TestValidator.equals(
    "existing locale localization should match created one (by locale)",
    fetchedExisting.locale,
    createdLocalization.locale,
  );

  TestValidator.equals(
    "existing locale localization should reference the same category",
    fetchedExisting.category?.id ?? null,
    category.id,
  );
}
