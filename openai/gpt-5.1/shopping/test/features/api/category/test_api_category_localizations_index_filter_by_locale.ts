import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategoryLocalization";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

/**
 * Verify that locale filtering on category localization index returns only
 * localizations for the requested locale and that pagination metadata matches
 * the number of records for that locale.
 *
 * Business workflow:
 *
 * 1. Bootstrap an admin account via POST /auth/admin/join to obtain administrative
 *    authorization.
 * 2. As that admin, create a base category using POST
 *    /shoppingMall/admin/categories.
 * 3. Still as admin, register three localizations for that category via POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations with locales:
 *
 *    - "en-US"
 *    - "ko-KR"
 *    - "ja-JP" and distinct `name` values.
 * 4. From a public (unauthenticated) client, call PATCH
 *    /shoppingMall/categories/{categoryId}/localizations with an
 *    IShoppingMallCategoryLocalization.IRequest body where:
 *
 *    - Page = 1
 *    - PageSize is large enough to capture all localized rows (e.g., 10)
 *    - Locale = "ko-KR"
 *    - Search, includeDeleted, sortBy, sortDirection are null
 * 5. Assert that only the ko-KR localization is returned, that all returned items
 *    have locale exactly equal to the requested locale, and that the pagination
 *    metadata reflects exactly one record and one page.
 */
export async function test_api_category_localizations_index_filter_by_locale(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join as a new administrator.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a base category as the authenticated admin.
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Create three distinct localizations for that category: en-US, ko-KR, ja-JP.
  const enLocalizationBody = {
    locale: "en-US",
    name: "Electronics (EN)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    seo_title: "Electronics - English",
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const koLocalizationBody = {
    locale: "ko-KR",
    name: "전자제품 (KO)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    seo_title: "전자제품 - 한국어",
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const jaLocalizationBody = {
    locale: "ja-JP",
    name: "家電 (JA)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    seo_title: "家電 - 日本語",
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const enLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: enLocalizationBody,
      },
    );
  typia.assert(enLocalization);

  const koLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: koLocalizationBody,
      },
    );
  typia.assert(koLocalization);

  const jaLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: jaLocalizationBody,
      },
    );
  typia.assert(jaLocalization);

  // 4. Call the public localization index endpoint as an unauthenticated client
  //    with locale filter set to "ko-KR".
  const pageSize = 10 as const;

  const requestBody = {
    page: 1 as 1 & tags.Type<"int32">,
    pageSize: pageSize as number & tags.Type<"int32">,
    locale: "ko-KR",
    search: null,
    includeDeleted: null,
    sortBy: null,
    sortDirection: null,
  } satisfies IShoppingMallCategoryLocalization.IRequest;

  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const pageResult: IPageIShoppingMallCategoryLocalization.ISummary =
    await api.functional.shoppingMall.categories.localizations.index(
      publicConnection,
      {
        categoryId: category.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // 5. Business assertions on locale filtering and pagination metadata.
  TestValidator.equals(
    "exactly one localization record is returned for ko-KR",
    data.length,
    1,
  );

  TestValidator.equals(
    "pagination.records equals number of ko-KR records (1)",
    pagination.records,
    1,
  );

  TestValidator.equals(
    "pagination.pages is 1 when there is a single record and non-zero limit",
    pagination.pages,
    1,
  );

  TestValidator.equals("pagination.current page is 1", pagination.current, 1);

  TestValidator.equals(
    "pagination.limit equals requested pageSize",
    pagination.limit,
    pageSize,
  );

  // Ensure all returned localizations have locale exactly "ko-KR" and belong to the created category.
  TestValidator.predicate(
    "all returned localizations have locale ko-KR",
    data.every((item) => item.locale === "ko-KR"),
  );

  TestValidator.predicate(
    "all returned localizations belong to the created category",
    data.every((item) => item.category.id === category.id),
  );
}
