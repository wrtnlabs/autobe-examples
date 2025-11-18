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

export async function test_api_category_localizations_index_exclude_deleted_by_default(
  connection: api.IConnection,
) {
  // 1. Admin join to get authorized admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category as parent for localizations
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Create two active localizations for the category
  const firstLocale = "en-US";
  const secondLocale = "ko-KR";

  const firstLocalizationBody = {
    locale: firstLocale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 2 }),
    seo_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const firstLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: firstLocalizationBody,
      },
    );
  typia.assert(firstLocalization);

  const secondLocalizationBody = {
    locale: secondLocale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 2 }),
    seo_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const secondLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: secondLocalizationBody,
      },
    );
  typia.assert(secondLocalization);

  // Helper to collect ids from data array
  const collectIds = (
    page: IPageIShoppingMallCategoryLocalization.ISummary,
  ): string[] => page.data.map((loc) => loc.id);

  // 4. Query localizations with includeDeleted omitted (default behavior)
  const requestWithoutDeleted = {
    page: 1,
    pageSize: 10,
    locale: null,
    search: null,
    includeDeleted: null,
    sortBy: null,
    sortDirection: null,
  } satisfies IShoppingMallCategoryLocalization.IRequest;

  const pageWithoutDeleted: IPageIShoppingMallCategoryLocalization.ISummary =
    await api.functional.shoppingMall.categories.localizations.index(
      connection,
      {
        categoryId: category.id,
        body: requestWithoutDeleted,
      },
    );
  typia.assert(pageWithoutDeleted);

  const idsWithoutDeleted = collectIds(pageWithoutDeleted);

  // Ensure that both created localizations are present in default listing
  TestValidator.predicate(
    "both newly created localizations must appear when includeDeleted is null",
    idsWithoutDeleted.includes(firstLocalization.id) &&
      idsWithoutDeleted.includes(secondLocalization.id),
  );

  // 5. Query localizations with includeDeleted explicitly set to false
  const requestIncludeDeletedFalse = {
    page: 1,
    pageSize: 10,
    locale: null,
    search: null,
    includeDeleted: false,
    sortBy: null,
    sortDirection: null,
  } satisfies IShoppingMallCategoryLocalization.IRequest;

  const pageIncludeDeletedFalse: IPageIShoppingMallCategoryLocalization.ISummary =
    await api.functional.shoppingMall.categories.localizations.index(
      connection,
      {
        categoryId: category.id,
        body: requestIncludeDeletedFalse,
      },
    );
  typia.assert(pageIncludeDeletedFalse);

  const idsIncludeDeletedFalse = collectIds(pageIncludeDeletedFalse);

  // Default behavior (null) and explicit false should be equivalent in our test setup
  TestValidator.equals(
    "includeDeleted null and false should yield same IDs in fresh category",
    idsIncludeDeletedFalse,
    idsWithoutDeleted,
  );

  // 6. Query localizations with includeDeleted set to true
  const requestIncludeDeletedTrue = {
    page: 1,
    pageSize: 10,
    locale: null,
    search: null,
    includeDeleted: true,
    sortBy: null,
    sortDirection: null,
  } satisfies IShoppingMallCategoryLocalization.IRequest;

  const pageIncludeDeletedTrue: IPageIShoppingMallCategoryLocalization.ISummary =
    await api.functional.shoppingMall.categories.localizations.index(
      connection,
      {
        categoryId: category.id,
        body: requestIncludeDeletedTrue,
      },
    );
  typia.assert(pageIncludeDeletedTrue);

  const idsIncludeDeletedTrue = collectIds(pageIncludeDeletedTrue);

  // All non-deleted localization IDs must still be present when includeDeleted is true
  TestValidator.predicate(
    "includeDeleted=true must contain at least all IDs from includeDeleted=false",
    idsWithoutDeleted.every((id) => idsIncludeDeletedTrue.includes(id)),
  );

  // And includeDeleted=true must not have fewer items than the non-deleted query
  TestValidator.predicate(
    "includeDeleted=true should have size >= default non-deleted listing",
    idsIncludeDeletedTrue.length >= idsWithoutDeleted.length,
  );
}
