import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentPolicyCategory";

export async function test_api_content_policy_category_search_sorting_and_pagination_edges(
  connection: api.IConnection,
) {
  /**
   * Validate sorting and pagination edges for content policy categories search.
   *
   * Business context: Platform admins manage a global taxonomy of content
   * policy categories (harassment, hate_speech, etc.). They need predictable,
   * stable paging and sorting when browsing this taxonomy. This test ensures
   * that the /communityPlatform/platformAdmin/contentPolicyCategories search
   * endpoint honors sortBy/sortDirection, returns consistent pagination
   * metadata, and behaves predictably on edge pages.
   *
   * Steps:
   *
   * 1. Join as a platform admin (auth.platformAdmin.join) to establish
   *    platformAdmin context.
   * 2. Seed multiple content policy categories (at least 5) with deterministic
   *    name ordering via contentPolicyCategories.create.
   * 3. Query the index endpoint sorted by name ascending with a small limit (2
   *    items per page) and validate:
   *
   *    - Pagination metadata (limit, records, pages, current)
   *    - Page-1 data is sorted by name ascending.
   * 4. Fetch page 2 with the same sort and filters, validate:
   *
   *    - No overlap in IDs between page 1 and page 2
   *    - Concatenated data from page 1 and 2 is globally sorted by name asc.
   * 5. Repeat steps 3–4 with sortDirection="desc" to confirm descending order.
   * 6. Request an out-of-range page (greater than pages) and confirm predictable
   *    behavior: either empty data array with consistent records and pages, or
   *    clamped current page within [0, pages].
   */

  // 1. Register a platform admin to get platformAdmin context
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Seed multiple content policy categories with deterministic names
  const baseCodes = ["alpha", "bravo", "charlie", "delta", "echo"] as const;
  const createdCategories: ICommunityPlatformContentPolicyCategory[] = [];

  for (const code of baseCodes) {
    const body = {
      code: `test_${code}_${RandomGenerator.alphaNumeric(6)}`,
      name: `Test Category ${code.toUpperCase()}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      isActive: true,
      isDefault: true,
    } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

    const created =
      await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformContentPolicyCategory>(created);
    createdCategories.push(created);
  }

  // Helper to check ascending/descending order by name
  const isSortedByNameAsc = (
    arr: ICommunityPlatformContentPolicyCategory.ISummary[],
  ): boolean => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].name.localeCompare(arr[i].name) > 0) return false;
    }
    return true;
  };
  const isSortedByNameDesc = (
    arr: ICommunityPlatformContentPolicyCategory.ISummary[],
  ): boolean => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].name.localeCompare(arr[i].name) < 0) return false;
    }
    return true;
  };

  // 3. Query first page, sort by name asc, limit=2
  const ascRequestPage1 = {
    sortBy: "name",
    sortDirection: "asc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const ascPage1 =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: ascRequestPage1 },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(ascPage1);

  TestValidator.predicate(
    "asc page1 limit equals request limit",
    () => ascPage1.pagination.limit === ascRequestPage1.limit,
  );
  TestValidator.predicate(
    "asc page1 current is 1",
    () => ascPage1.pagination.current === ascRequestPage1.page,
  );
  TestValidator.predicate(
    "asc page1 pages non-negative",
    () => ascPage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "asc page1 records non-negative",
    () => ascPage1.pagination.records >= 0,
  );

  TestValidator.predicate("asc page1 data sorted by name asc", () =>
    isSortedByNameAsc(ascPage1.data),
  );

  // 4. Query second page with same sort
  const ascRequestPage2 = {
    sortBy: "name",
    sortDirection: "asc",
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const ascPage2 =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: ascRequestPage2 },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(ascPage2);

  TestValidator.predicate(
    "asc page2 current is 2",
    () => ascPage2.pagination.current === ascRequestPage2.page,
  );

  const ascIdsPage1 = ascPage1.data.map((c) => c.id);
  const ascIdsPage2 = ascPage2.data.map((c) => c.id);

  const hasOverlapAsc = ascIdsPage1.some((id) => ascIdsPage2.includes(id));
  TestValidator.predicate(
    "no ID overlap between asc page1 and page2",
    () => !hasOverlapAsc,
  );

  const combinedAsc = [...ascPage1.data, ...ascPage2.data];
  TestValidator.predicate("combined asc pages sorted by name asc", () =>
    isSortedByNameAsc(combinedAsc),
  );

  // 5. Repeat with descending sort
  const descRequestPage1 = {
    sortBy: "name",
    sortDirection: "desc",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const descPage1 =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: descRequestPage1 },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
    descPage1,
  );

  TestValidator.predicate("desc page1 data sorted by name desc", () =>
    isSortedByNameDesc(descPage1.data),
  );

  const descRequestPage2 = {
    sortBy: "name",
    sortDirection: "desc",
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const descPage2 =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: descRequestPage2 },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
    descPage2,
  );

  const descIdsPage1 = descPage1.data.map((c) => c.id);
  const descIdsPage2 = descPage2.data.map((c) => c.id);

  const hasOverlapDesc = descIdsPage1.some((id) => descIdsPage2.includes(id));
  TestValidator.predicate(
    "no ID overlap between desc page1 and page2",
    () => !hasOverlapDesc,
  );

  const combinedDesc = [...descPage1.data, ...descPage2.data];
  TestValidator.predicate("combined desc pages sorted by name desc", () =>
    isSortedByNameDesc(combinedDesc),
  );

  // 6. Out-of-range page behavior
  const pages = ascPage1.pagination.pages;
  const outOfRangePage = pages + 100;

  const outOfRangeRequest = {
    sortBy: "name",
    sortDirection: "asc",
    page: (outOfRangePage || 9999) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformContentPolicyCategory.IRequest;

  const outOfRange =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.index(
      connection,
      { body: outOfRangeRequest },
    );
  typia.assert<IPageICommunityPlatformContentPolicyCategory.ISummary>(
    outOfRange,
  );

  TestValidator.predicate(
    "out-of-range records equal asc records",
    () => outOfRange.pagination.records === ascPage1.pagination.records,
  );
  TestValidator.predicate(
    "out-of-range pages equal asc pages",
    () => outOfRange.pagination.pages === ascPage1.pagination.pages,
  );

  TestValidator.predicate(
    "out-of-range page either empty data or clamped current",
    () =>
      outOfRange.data.length === 0 ||
      (outOfRange.pagination.current >= 0 &&
        outOfRange.pagination.current <= outOfRange.pagination.pages),
  );
}
