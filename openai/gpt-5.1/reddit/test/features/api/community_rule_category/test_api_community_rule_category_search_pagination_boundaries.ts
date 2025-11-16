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

export async function test_api_community_rule_category_search_pagination_boundaries(
  connection: api.IConnection,
) {
  /**
   * 1. Register a platform administrator (dependency requirement).
   * 2. As that admin, create 15 community rule categories with a unique prefix,
   *    deterministic sort_order, and active status.
   * 3. Search categories with PATCH /communityPlatform/communityRuleCategories
   *    using a search term matching only the newly created categories and
   *    pageSize=10.
   * 4. Validate first page size, pagination metadata, and that it respects page
   *    boundaries.
   * 5. Fetch the second page and validate remaining records and that there are no
   *    duplicated ids between page 1 and 2.
   * 6. Request a far-out page index (e.g., 999) and assert it yields an empty data
   *    array while keeping pagination metadata consistent.
   * 7. Confirm that concatenated results from page 1 and 2 are already ordered
   *    stably by sort_order asc, then id asc.
   */

  // 1. Platform admin join (dependency requirement)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Bulk-create community rule categories (15 items for 2 pages with size 10)
  const totalCategories = 15;
  const prefix = `test_category_${RandomGenerator.alphabets(6)}`;

  const createdCategories: ICommunityPlatformCommunityRuleCategory[] =
    await ArrayUtil.asyncRepeat(totalCategories, async (index) => {
      const code = `${prefix}_${index + 1}`;
      const name = `Test Category ${index + 1} ${prefix}`;
      const description = RandomGenerator.paragraph({ sentences: 5 });
      const sortOrder = index + 1;

      const body = {
        code,
        name,
        description,
        sort_order: sortOrder,
        is_active: true,
      } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

      const created =
        await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
          connection,
          { body },
        );
      typia.assert(created);
      return created;
    });

  // Verify we created expected count (sanity check)
  TestValidator.equals(
    "created category count",
    createdCategories.length,
    totalCategories,
  );

  // 3. Helper to call index with given page and pageSize, filtered by prefix
  const searchPage = async (
    page: number,
    pageSize: number,
  ): Promise<IPageICommunityPlatformCommunityRuleCategory.ISummary> => {
    const body = {
      page,
      pageSize,
      search: prefix,
      is_active: true,
    } satisfies ICommunityPlatformCommunityRuleCategory.IRequest;

    const result =
      await api.functional.communityPlatform.communityRuleCategories.index(
        connection,
        { body },
      );
    typia.assert(result);
    return result;
  };

  const pageSize = 10;

  // 4. Page 1
  const firstPage = await searchPage(1, pageSize);

  // Basic shape
  TestValidator.equals(
    "first page size should be 10 (or totalCategories if smaller)",
    firstPage.data.length,
    Math.min(pageSize, totalCategories),
  );

  // Pagination metadata sanity
  TestValidator.predicate(
    "pagination.records is at least totalCategories",
    firstPage.pagination.records >= totalCategories,
  );
  TestValidator.predicate(
    "pagination.pages is at least 2 when more than pageSize records exist",
    totalCategories > pageSize
      ? firstPage.pagination.pages >= 2
      : firstPage.pagination.pages >= 1,
  );

  // 5. Page 2
  const secondPage = await searchPage(2, pageSize);

  const expectedSecondSize =
    totalCategories > pageSize ? totalCategories - pageSize : 0;

  TestValidator.equals(
    "second page size should match remaining records (may be 0)",
    secondPage.data.length,
    expectedSecondSize,
  );

  if (expectedSecondSize > 0) {
    TestValidator.predicate(
      "second page has positive length when more than pageSize created",
      secondPage.data.length > 0,
    );
  }

  // No duplicates between page1 and page2 based on id
  const firstIds = new Set(firstPage.data.map((c) => c.id));
  const duplicateExists = secondPage.data.some((c) => firstIds.has(c.id));
  TestValidator.predicate(
    "no duplicate ids between first and second page",
    duplicateExists === false,
  );

  // 6. Out-of-range page (e.g., 999)
  const outOfRangePageIndex = 999;
  const outPage = await searchPage(outOfRangePageIndex, pageSize);

  TestValidator.equals(
    "out-of-range page should have empty data",
    outPage.data.length,
    0,
  );

  // pagination.records and pagination.pages remain consistent with firstPage
  TestValidator.equals(
    "out-of-range page should keep records count consistent",
    outPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "out-of-range page should keep pages count consistent",
    outPage.pagination.pages,
    firstPage.pagination.pages,
  );

  // 7. Ordering stability across pages
  const merged = [...firstPage.data, ...secondPage.data];

  const locallySorted = [...merged].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  TestValidator.equals(
    "merged pagination data should be sorted by sort_order asc, id asc",
    merged,
    locallySorted,
  );
}
