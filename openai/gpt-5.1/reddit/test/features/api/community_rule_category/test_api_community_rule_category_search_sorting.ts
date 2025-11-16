import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRuleCategory";

export async function test_api_community_rule_category_search_sorting(
  connection: api.IConnection,
) {
  /**
   * Validate deterministic sorting of community rule categories.
   *
   * Business goal: Ensure PATCH /communityPlatform/communityRuleCategories
   * honors orderBy/orderDirection for stable sorting without affecting
   * pagination metadata.
   *
   * Steps:
   *
   * 1. Join as platform admin (auth prerequisite).
   * 2. Create three+ community rule categories with distinct sort_order and code
   *    using the platformAdmin create endpoint.
   * 3. Search with orderBy="sort_order", orderDirection="asc" and verify ascending
   *    order and stable pagination metadata.
   * 4. Search with orderBy="sort_order", orderDirection="desc" and verify reversed
   *    ordering of the same records.
   * 5. Repeat checks for orderBy="code" to validate code-based deterministic
   *    sorting.
   */

  // 1. Register a platform administrator (auth/platformAdmin/join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least three categories with distinct sort_order and code
  const baseCode = RandomGenerator.alphaNumeric(8);

  const createCategory = async (
    suffix: string,
    sortOrder: number & tags.Type<"int32">,
  ): Promise<ICommunityPlatformCommunityRuleCategory> => {
    const body = {
      code: `${baseCode}_${suffix}`,
      name: `Category ${suffix}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      sort_order: sortOrder,
      is_active: true,
    } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

    const created: ICommunityPlatformCommunityRuleCategory =
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  };

  const cat1 = await createCategory("A", 10 as number & tags.Type<"int32">);
  const cat2 = await createCategory("B", 20 as number & tags.Type<"int32">);
  const cat3 = await createCategory("C", 30 as number & tags.Type<"int32">);

  const createdCategories: ICommunityPlatformCommunityRuleCategory[] = [
    cat1,
    cat2,
    cat3,
  ];

  // 3. Search with orderBy="sort_order", orderDirection="asc"
  const requestAscBySortOrder = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    orderBy: "sort_order",
    orderDirection: "asc",
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const pageAscBySortOrder: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      { body: requestAscBySortOrder },
    );
  typia.assert(pageAscBySortOrder);

  // Ensure pagination metadata is coherent
  const paginationAsc = pageAscBySortOrder.pagination;
  typia.assert<IPage.IPagination>(paginationAsc);

  TestValidator.predicate(
    "records count must be non-negative",
    paginationAsc.records >= 0,
  );
  TestValidator.predicate(
    "pages count must be non-negative",
    paginationAsc.pages >= 0,
  );

  // Extract just the categories we created from the page data
  const ascData = pageAscBySortOrder.data;
  const ascForCreated = ascData.filter((item) =>
    createdCategories.some((c) => c.id === item.id),
  );

  TestValidator.equals(
    "at least three created categories should be present in asc result",
    ascForCreated.length,
    createdCategories.length,
  );

  // Validate ascending sort_order for our created subset
  const ascSortOrders = ascForCreated.map((c) => c.sort_order);
  for (let i = 1; i < ascSortOrders.length; i++) {
    TestValidator.predicate(
      `sort_order ascending at index ${i}`,
      ascSortOrders[i - 1] <= ascSortOrders[i],
    );
  }

  // 4. Search with orderBy="sort_order", orderDirection="desc"
  const requestDescBySortOrder = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    orderBy: "sort_order",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const pageDescBySortOrder: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      { body: requestDescBySortOrder },
    );
  typia.assert(pageDescBySortOrder);

  const paginationDesc = pageDescBySortOrder.pagination;
  typia.assert<IPage.IPagination>(paginationDesc);

  // Pagination metadata should be consistent (records/pages unchanged)
  TestValidator.equals(
    "records count must be same between asc and desc sort_order",
    paginationDesc.records,
    paginationAsc.records,
  );
  TestValidator.equals(
    "pages count must be same between asc and desc sort_order",
    paginationDesc.pages,
    paginationAsc.pages,
  );

  const descData = pageDescBySortOrder.data;
  const descForCreated = descData.filter((item) =>
    createdCategories.some((c) => c.id === item.id),
  );

  TestValidator.equals(
    "three created categories should be present in desc result",
    descForCreated.length,
    createdCategories.length,
  );

  // Validate descending sort_order for our subset
  const descSortOrders = descForCreated.map((c) => c.sort_order);
  for (let i = 1; i < descSortOrders.length; i++) {
    TestValidator.predicate(
      `sort_order descending at index ${i}`,
      descSortOrders[i - 1] >= descSortOrders[i],
    );
  }

  // Cross-check that ordering is reversed compared to asc
  const ascIds = ascForCreated.map((c) => c.id);
  const descIds = descForCreated.map((c) => c.id);

  TestValidator.equals(
    "desc sort_order order should be reverse of asc sort_order order",
    descIds,
    [...ascIds].reverse(),
  );

  // 5. Validate sorting by code as an additional deterministic field
  const requestAscByCode = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    orderBy: "code",
    orderDirection: "asc",
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const pageAscByCode: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      { body: requestAscByCode },
    );
  typia.assert(pageAscByCode);

  const ascByCodeForCreated = pageAscByCode.data.filter((item) =>
    createdCategories.some((c) => c.id === item.id),
  );

  TestValidator.equals(
    "three created categories should be present in asc code result",
    ascByCodeForCreated.length,
    createdCategories.length,
  );

  const ascCodes = ascByCodeForCreated.map((c) => c.code);
  for (let i = 1; i < ascCodes.length; i++) {
    TestValidator.predicate(
      `code ascending at index ${i}`,
      ascCodes[i - 1] <= ascCodes[i],
    );
  }

  const requestDescByCode = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    orderBy: "code",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

  const pageDescByCode: IPageICommunityPlatformCommunityRuleCategory.ISummary =
    await api.functional.communityPlatform.communityRuleCategories.index(
      connection,
      { body: requestDescByCode },
    );
  typia.assert(pageDescByCode);

  const descByCodeForCreated = pageDescByCode.data.filter((item) =>
    createdCategories.some((c) => c.id === item.id),
  );

  TestValidator.equals(
    "three created categories should be present in desc code result",
    descByCodeForCreated.length,
    createdCategories.length,
  );

  const descCodes = descByCodeForCreated.map((c) => c.code);
  for (let i = 1; i < descCodes.length; i++) {
    TestValidator.predicate(
      `code descending at index ${i}`,
      descCodes[i - 1] >= descCodes[i],
    );
  }

  const ascCodeIds = ascByCodeForCreated.map((c) => c.id);
  const descCodeIds = descByCodeForCreated.map((c) => c.id);

  TestValidator.equals(
    "desc code order should be reverse of asc code order",
    descCodeIds,
    [...ascCodeIds].reverse(),
  );
}
