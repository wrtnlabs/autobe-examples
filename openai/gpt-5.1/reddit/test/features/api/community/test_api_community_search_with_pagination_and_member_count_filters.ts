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

export async function test_api_community_search_with_pagination_and_member_count_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin: create a dedicated visibility level
  const platformAdminPassword = RandomGenerator.alphaNumeric(16);

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(12),
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  // We rely on join having already set the Authorization header for platformAdmin.
  const visibilityCode = `test-visible-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: `Test Visibility ${RandomGenerator.name(1)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 2. Member user: join (join also sets Authorization header for memberUser)
  const memberUserPassword = RandomGenerator.alphaNumeric(16);
  const memberUserEmail = `${RandomGenerator.alphabets(10)}@example.com`;

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberUserEmail,
      password: memberUserPassword,
      ip: null,
      href: "https://app.example.com/join",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 3. Create multiple communities with the dedicated visibility code
  const sharedSearchToken = "Pagination Filter Test";
  const createdCommunities: ICommunityPlatformCommunity[] = [];

  const communityCount = 7;
  for (let i = 0; i < communityCount; ++i) {
    const community =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        {
          body: {
            identifier: `test-community-${RandomGenerator.alphaNumeric(8)}-${i}`,
            title: `${sharedSearchToken} #${i + 1}`,
            description: RandomGenerator.paragraph({ sentences: 8 }),
            visibilityLevelCode: visibilityLevel.code,
            isNsfw: i % 2 === 0,
            primaryTagIds: undefined,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert<ICommunityPlatformCommunity>(community);
    createdCommunities.push(community);
  }

  // helper base request for communities.index
  const baseRequest = {
    search: sharedSearchToken,
    visibilityLevelCodes: [visibilityLevel.code],
    minMemberCount: 0,
    maxMemberCount: 100,
    includeHidden: false,
    sortBy: "createdAt",
    sortDirection: "asc" as const,
  } satisfies ICommunityPlatformCommunity.IRequest;

  // 4. First page: limit smaller than total communities
  const limit = 3;

  const page1Response =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        ...baseRequest,
        page: 1,
        limit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(page1Response);

  const pagination1 = page1Response.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "first page current should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "first page limit matches request",
    pagination1.limit,
    limit,
  );

  TestValidator.predicate(
    "first page should contain at most requested limit records",
    page1Response.data.length <= limit,
  );

  // ensure that all returned communities have the configured visibility code
  for (const summary of page1Response.data) {
    TestValidator.equals(
      "summary visibility code matches filter (page1)",
      summary.visibilityLevel.code,
      visibilityLevel.code,
    );
  }

  // 5. Second page with same limit
  const page2Response =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        ...baseRequest,
        page: 2,
        limit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(page2Response);

  const pagination2 = page2Response.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals(
    "second page current should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "second page limit matches request",
    pagination2.limit,
    limit,
  );

  for (const summary of page2Response.data) {
    TestValidator.equals(
      "summary visibility code matches filter (page2)",
      summary.visibilityLevel.code,
      visibilityLevel.code,
    );
  }

  // ensure non-overlapping IDs between page1 and page2 datasets
  const page1Ids = page1Response.data.map((s) => s.id);
  const page2Ids = page2Response.data.map((s) => s.id);

  for (const id1 of page1Ids) {
    for (const id2 of page2Ids) {
      TestValidator.notEquals("page1/page2 IDs should not overlap", id1, id2);
    }
  }

  // 6. Accumulate all pages for this filter
  const allFilteredSummaries: ICommunityPlatformCommunity.ISummary[] = [];

  const totalPages = pagination1.pages;
  for (let page = 1; page <= totalPages; ++page) {
    const response = await api.functional.communityPlatform.communities.index(
      connection,
      {
        body: {
          ...baseRequest,
          page,
          limit,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
    typia.assert<IPageICommunityPlatformCommunity.ISummary>(response);
    for (const summary of response.data) {
      if (summary.visibilityLevel.code === visibilityLevel.code) {
        allFilteredSummaries.push(summary);
      }
    }
  }

  // Verify that every created community appears in the aggregated filtered list
  for (const created of createdCommunities) {
    const found = allFilteredSummaries.some(
      (summary) => summary.id === created.id,
    );
    TestValidator.predicate(
      "created community must be discoverable in filtered search",
      found,
    );
  }

  // 7. Stable ordering: repeated call to page 1 with identical parameters
  const page1Repeat = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        ...baseRequest,
        page: 1,
        limit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(page1Repeat);

  TestValidator.equals(
    "repeated page1 results should be stable",
    page1Repeat.data,
    page1Response.data,
  );

  // 8. Member-count filters sanity: same range gives consistent pagination
  const withMemberRange =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        ...baseRequest,
        minMemberCount: 0,
        maxMemberCount: 100,
        page: 1,
        limit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(withMemberRange);

  const withMemberRangeRepeat =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        ...baseRequest,
        minMemberCount: 0,
        maxMemberCount: 100,
        page: 1,
        limit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(
    withMemberRangeRepeat,
  );

  TestValidator.equals(
    "member-count filtered results should be stable for same range",
    withMemberRange.pagination.records,
    withMemberRangeRepeat.pagination.records,
  );
}
