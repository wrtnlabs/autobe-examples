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
 * Validate public community keyword search behavior.
 *
 * Business goal: Ensure that the public community search endpoint returns only
 * communities whose title/description match a given free-text keyword when
 * called without authentication, and that pagination metadata correctly
 * reflects the number of matches.
 *
 * High-level flow:
 *
 * 1. Register a platform admin and implicitly log them in via join.
 * 2. As the platform admin, create a visibility level (e.g. "public") to be used
 *    when creating test communities.
 * 3. Register a member user (join, which also authenticates the member).
 * 4. As the member user, create at least two communities:
 *
 *    - One whose title and/or description contains a specific keyword (e.g.
 *         "programming").
 *    - Another without that keyword, to act as a negative control.
 * 5. Construct an unauthenticated connection (no Authorization header).
 * 6. Call PATCH /communityPlatform/communities/search with a request body
 *    (ICommunityPlatformCommunity.IRequest) whose `search` term equals the
 *    chosen keyword and with a deterministic page/limit.
 * 7. Validate that:
 *
 *    - Response type matches IPageICommunityPlatformCommunity.ISummary.
 *    - `data` contains the matching community.
 *    - `data` does not contain the non-matching community.
 *    - `pagination.records` equals the number of matches.
 *    - `pagination.pages` and `pagination.current` are consistent with configured
 *         `page` and `limit`.
 * 8. Optionally, perform a second search with an unrelated keyword and assert that
 *    either zero results are returned or none of the created communities
 *    appear.
 */
export async function test_api_public_community_search_by_keyword(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via /auth/platformAdmin/join
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a visibility level (e.g. "public").
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // Assert that returned visibility summary matches code/name used for creation
  TestValidator.equals(
    "visibility code should match created",
    visibilityLevel.code,
    visibilityCode,
  );
  TestValidator.equals(
    "visibility name should match created",
    visibilityLevel.name,
    visibilityCreateBody.name,
  );

  // 3. Register a member user (join) and keep them authenticated for community creation.
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(10),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As the member user, create two communities with distinct titles/descriptions.
  const keyword = "programming";

  const matchingCommunityCreateBody = {
    identifier: `prog_${RandomGenerator.alphaNumeric(8)}`,
    title: `Community about ${keyword}`,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 10,
    }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const matchingCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: matchingCommunityCreateBody,
      },
    );
  typia.assert(matchingCommunity);

  const nonMatchingCommunityCreateBody = {
    identifier: `general_${RandomGenerator.alphaNumeric(8)}`,
    title: "General chit-chat",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const nonMatchingCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: nonMatchingCommunityCreateBody,
      },
    );
  typia.assert(nonMatchingCommunity);

  // 5. Construct an unauthenticated connection for public search (no Authorization header).
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Execute search with keyword that should match exactly one community.
  const searchRequestBody = {
    page: 1,
    limit: 10,
    search: keyword,
    visibilityLevelCodes: undefined,
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: false,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const searchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      publicConnection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(searchResult);

  const { pagination, data } = searchResult;

  // 7. Validate that the matching community is present and the non-matching is absent.
  const hasMatching = data.some(
    (summary) => summary.id === matchingCommunity.id,
  );
  const hasNonMatching = data.some(
    (summary) => summary.id === nonMatchingCommunity.id,
  );

  TestValidator.predicate(
    "search results should contain the programming community",
    hasMatching,
  );
  TestValidator.predicate(
    "search results should not contain the unrelated community",
    !hasNonMatching,
  );

  // Validate basic pagination invariants.
  TestValidator.predicate(
    "pagination.records should be at least 1 for matching keyword",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "current page should be within bounds",
    pagination.current >= 0 && pagination.current <= pagination.pages,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    pagination.pages >= 0,
  );

  // 8. Optional: search with an unrelated keyword expected to yield zero matches.
  const unrelatedKeyword =
    "nonexistent_keyword_" + RandomGenerator.alphaNumeric(6);
  const unrelatedSearchBody = {
    page: 1,
    limit: 10,
    search: unrelatedKeyword,
    visibilityLevelCodes: undefined,
    tagIds: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    minMemberCount: undefined,
    maxMemberCount: undefined,
    includeHidden: false,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const unrelatedSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      publicConnection,
      {
        body: unrelatedSearchBody,
      },
    );
  typia.assert(unrelatedSearchResult);

  TestValidator.predicate(
    "unrelated keyword search should not return matching or non-matching communities",
    unrelatedSearchResult.data.every(
      (summary) =>
        summary.id !== matchingCommunity.id &&
        summary.id !== nonMatchingCommunity.id,
    ),
  );
}
