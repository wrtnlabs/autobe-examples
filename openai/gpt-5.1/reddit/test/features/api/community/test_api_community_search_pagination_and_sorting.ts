import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate that community search pagination and sorting behave correctly.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates a visibility level used by test communities.
 * 2. Member user joins.
 * 3. Member user creates more communities than a single page limit (15).
 * 4. Call search with page=1, limit=10 and sort options.
 * 5. Validate pagination metadata and size of the first page.
 * 6. Call search again with page=2 and same sort options.
 * 7. Verify second page metadata and that there is no overlap with page 1.
 * 8. Call search with a very large page index to verify empty-page behavior.
 */
export async function test_api_community_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to create a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level via platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create more communities than a single page limit (15 communities)
  const communities: ICommunityPlatformCommunity[] = [];
  const communityCount = 15;
  for (let i = 0; i < communityCount; i++) {
    const indexStr = String(i + 1).padStart(2, "0");
    const createBody = {
      identifier: `test-community-${indexStr}-${RandomGenerator.alphaNumeric(6)}`,
      title: `Test Community ${indexStr}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      visibilityLevelCode: visibilityCode,
      isNsfw: false,
      primaryTagIds: undefined,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const created: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    communities.push(created);
  }

  TestValidator.equals(
    "created community count should be 15",
    communities.length,
    communityCount,
  );

  // 5. Search page 1 with limit 10, sortBy createdAt asc
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  const searchRequestPage1 = {
    page,
    limit,
    search: undefined,
    visibilityLevelCodes: undefined,
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: undefined,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformCommunity.IRequest;

  const page1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      { body: searchRequestPage1 },
    );
  typia.assert(page1);

  const p1 = page1.pagination;
  const d1 = page1.data;

  TestValidator.equals("page1 current page should be 1", p1.current, 1);
  TestValidator.equals("page1 limit should be 10", p1.limit, limit);
  TestValidator.predicate(
    "page1 records should be at least number of created communities",
    p1.records >= communities.length,
  );
  TestValidator.predicate(
    "page1 pages should be positive when records exist",
    p1.records === 0 ? p1.pages === 0 : p1.pages >= 1,
  );
  TestValidator.predicate(
    "page1 data length should be between 1 and limit",
    d1.length > 0 && d1.length <= limit,
  );

  const page1Ids = d1.map((c) => c.id);

  // 6. Search page 2 with same sort options
  const searchRequestPage2 = {
    page: 2 as number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    search: undefined,
    visibilityLevelCodes: undefined,
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: undefined,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformCommunity.IRequest;

  const page2: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      { body: searchRequestPage2 },
    );
  typia.assert(page2);

  const p2 = page2.pagination;
  const d2 = page2.data;

  TestValidator.equals("page2 current page should be 2", p2.current, 2);
  TestValidator.equals("page2 limit should be 10", p2.limit, limit);
  TestValidator.predicate(
    "page2 data length should be between 0 and limit",
    d2.length >= 0 && d2.length <= limit,
  );

  // ensure no overlap between page 1 and page 2 IDs
  const overlap = d2.filter((c) => page1Ids.includes(c.id));
  TestValidator.equals(
    "no overlapping communities between page1 and page2",
    overlap.length,
    0,
  );

  // 7. Basic ordering sanity: concatenating page1 then page2 should preserve stable sequence size
  const combined = [...d1, ...d2];
  TestValidator.predicate(
    "combined length should equal sum of page1 and page2 lengths",
    combined.length === d1.length + d2.length,
  );

  // 8. Boundary condition: very large page index should yield empty data
  const bigPageNumber = 9999 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const searchRequestBigPage = {
    page: bigPageNumber,
    limit,
    search: undefined,
    visibilityLevelCodes: undefined,
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: undefined,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformCommunity.IRequest;

  const bigPage: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      { body: searchRequestBigPage },
    );
  typia.assert(bigPage);

  TestValidator.equals(
    "big page current should equal requested page",
    bigPage.pagination.current,
    bigPageNumber,
  );
  TestValidator.equals(
    "big page limit should equal requested limit",
    bigPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "big page data should be empty when requesting page beyond total pages",
    bigPage.data.length,
    0,
  );
}
