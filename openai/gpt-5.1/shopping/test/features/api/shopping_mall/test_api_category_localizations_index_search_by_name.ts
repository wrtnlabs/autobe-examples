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

export async function test_api_category_localizations_index_search_by_name(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated context for admin operations
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a category under which localizations will be registered
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: "Search Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 3. Create multiple localizations for this category
  const searchSubstring = "Electro";

  const localizationInputs: IShoppingMallCategoryLocalization.ICreate[] = [
    {
      locale: "en-US",
      name: "Electronics",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      seo_title: "Electronics Category",
      seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
    {
      locale: "en-GB",
      name: "Electro Home",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      seo_title: "Electro Home Category",
      seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
    {
      locale: "ko-KR",
      name: "가전제품",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      seo_title: "가전제품 카테고리",
      seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  ];

  const createdLocalizations: IShoppingMallCategoryLocalization[] = [];

  for (const input of localizationInputs) {
    const created =
      await api.functional.shoppingMall.admin.categories.localizations.create(
        connection,
        {
          categoryId: category.id,
          body: input satisfies IShoppingMallCategoryLocalization.ICreate,
        },
      );
    typia.assert<IShoppingMallCategoryLocalization>(created);
    createdLocalizations.push(created);
  }

  // Split expected matching vs non-matching sets by substring in name
  const expectedMatching = createdLocalizations.filter((loc) =>
    loc.name.includes(searchSubstring),
  );
  const expectedNonMatching = createdLocalizations.filter(
    (loc) => !loc.name.includes(searchSubstring),
  );

  // Sanity check: ensure we actually have both matching and non-matching
  TestValidator.predicate(
    "should have at least one matching localization",
    expectedMatching.length > 0,
  );
  TestValidator.predicate(
    "should have at least one non-matching localization",
    expectedNonMatching.length > 0,
  );

  // 4. Call public search endpoint with substring filter
  const page = 1 as number & tags.Type<"int32">;
  const pageSize = 10 as number & tags.Type<"int32">;

  const searchRequestBody = {
    page,
    pageSize,
    locale: null,
    search: searchSubstring,
    includeDeleted: false,
    sortBy: null,
    sortDirection: null,
  } satisfies IShoppingMallCategoryLocalization.IRequest;

  const searchResult =
    await api.functional.shoppingMall.categories.localizations.index(
      connection,
      {
        categoryId: category.id,
        body: searchRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallCategoryLocalization.ISummary>(searchResult);

  const pagination = searchResult.pagination;
  const data = searchResult.data;

  // 5. Validate pagination metadata
  TestValidator.equals<number & tags.Type<"int32">>(
    "pagination current page should be requested page",
    pagination.current,
    page,
  );
  TestValidator.equals<number & tags.Type<"int32">>(
    "pagination limit should equal requested pageSize",
    pagination.limit,
    pageSize,
  );

  TestValidator.equals(
    "pagination records should equal number of expected matches",
    pagination.records,
    expectedMatching.length,
  );

  TestValidator.predicate(
    "pagination pages should be at least 1 when there are records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 6. Validate that all returned localizations match substring and category
  TestValidator.equals(
    "result count should equal expected matching count",
    data.length,
    expectedMatching.length,
  );

  for (const loc of data) {
    typia.assert<IShoppingMallCategoryLocalization.ISummary>(loc);

    TestValidator.equals(
      "localization.category.id should equal created category id",
      loc.category.id,
      category.id,
    );

    TestValidator.predicate(
      "localization name should contain search substring",
      loc.name.includes(searchSubstring),
    );
  }

  // Ensure that every expected matching localization id appears in result
  const resultIds = data.map((loc) => loc.id).sort();
  const expectedMatchIds = expectedMatching.map((loc) => loc.id).sort();

  TestValidator.equals(
    "all expected matching localization ids should be returned",
    resultIds,
    expectedMatchIds,
  );

  // Ensure that non-matching localizations are not returned
  for (const non of expectedNonMatching) {
    TestValidator.predicate(
      "non-matching localization should not be present in result",
      !resultIds.includes(non.id),
    );
  }

  // 7. Optional: search with a term that matches nothing to verify empty result
  const nonMatchSearchTerm = "XYZNONMATCH";

  const nonMatchRequestBody = {
    page,
    pageSize,
    locale: null,
    search: nonMatchSearchTerm,
    includeDeleted: false,
    sortBy: null,
    sortDirection: null,
  } satisfies IShoppingMallCategoryLocalization.IRequest;

  const nonMatchResult =
    await api.functional.shoppingMall.categories.localizations.index(
      connection,
      {
        categoryId: category.id,
        body: nonMatchRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallCategoryLocalization.ISummary>(nonMatchResult);

  TestValidator.equals(
    "non-matching search should return zero records",
    nonMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search should return empty data array",
    nonMatchResult.data.length,
    0,
  );
}
