import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipStatistics";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembershipStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembershipStatistics";

/**
 * Validate empty-result behavior of community membership statistics.
 *
 * Business goal: Ensure that the statistics endpoint PATCH
 * /communityPlatform/statistics/communities/membership returns a well-formed,
 * successful paginated response when the applied filters produce no matching
 * membership statistics entries.
 *
 * High-level workflow:
 *
 * 1. Register a platformAdmin account and obtain its authenticated context.
 * 2. As platformAdmin, create a dedicated visibility level that will be used by a
 *    test community.
 * 3. Register a memberUser account and obtain its authenticated context.
 * 4. As memberUser, create a community that uses the newly created visibility
 *    level.
 * 5. Call the statistics endpoint with filters that are guaranteed to yield no
 *    results, using:
 *
 *    - CommunityIdentifiers that target a community which has just been created but
 *         for which no memberships have been explicitly created (we assume
 *         separate membership APIs manage joins, which are not invoked in this
 *         test), and
 *    - A joinedFrom/joinedTo window that is set in the distant past to avoid
 *         accidentally intersecting any system-created membership rows.
 * 6. Assert that the response is structurally valid and that it represents an
 *    empty page of statistics:
 *
 *    - Data is an empty array
 *    - Pagination.records is 0
 *    - Pagination.pages is 0
 *    - Pagination.limit and pagination.current are non-negative
 * 7. Optionally perform a follow-up call without extreme filters to show that the
 *    endpoint still returns a valid structure, but the primary business
 *    assertion is focused on the empty-result case.
 */
export async function test_api_community_membership_statistics_empty_result_behavior(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to seed a platformAdmin actor.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. As platformAdmin, create a visibility level for our test community.
  const visibilityCode = `vl_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
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

  // 3. Register member user (join) to act as a community creator.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: "P@ssw0rd!",
    ip: "192.168.0.10",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser (current connection is already authenticated as
  //    memberUser after the join call), create a new community.
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Test Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Build a statistics request that is guaranteed to yield no rows.
  //    We choose a joinedAt window far in the past (e.g., 1980) such that
  //    no realistic membership rows would exist in that timeframe for the
  //    freshly created community.
  const joinedFromPast = new Date("1980-01-01T00:00:00.000Z").toISOString();
  const joinedToPast = new Date("1980-12-31T23:59:59.000Z").toISOString();

  const emptyStatsRequest = {
    communityIdentifiers: [community.identifier],
    joinedFrom: joinedFromPast,
    joinedTo: joinedToPast,
    page: 1,
    limit: 10,
    orderBy: "total_members_count",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityMembershipStatistics.IRequest;

  const emptyStatsPage: IPageICommunityPlatformCommunityMembershipStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.membership.index(
      connection,
      {
        body: emptyStatsRequest,
      },
    );
  typia.assert(emptyStatsPage);

  // 6. Validate that the response represents an empty page of statistics.
  TestValidator.equals(
    "statistics data should be empty when no memberships match filters",
    emptyStatsPage.data,
    [],
  );

  TestValidator.equals(
    "statistics pagination.records should be 0 when empty",
    emptyStatsPage.pagination.records,
    0,
  );

  TestValidator.equals(
    "statistics pagination.pages should be 0 when empty",
    emptyStatsPage.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "statistics pagination.limit must be non-negative",
    emptyStatsPage.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "statistics pagination.current must be non-negative",
    emptyStatsPage.pagination.current >= 0,
  );

  // 7. Optional sanity: call the endpoint with a broader window but still
  //    targeting the same community, just to ensure non-error behavior. We
  //    only assert structural validity here.
  const broadStatsRequest = {
    communityIdentifiers: [community.identifier],
    page: 1,
    limit: 5,
    orderBy: "total_members_count",
    orderDirection: "desc",
  } satisfies ICommunityPlatformCommunityMembershipStatistics.IRequest;

  const broadStatsPage: IPageICommunityPlatformCommunityMembershipStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.membership.index(
      connection,
      {
        body: broadStatsRequest,
      },
    );
  typia.assert(broadStatsPage);

  TestValidator.predicate(
    "broader statistics response should have non-negative record count",
    broadStatsPage.pagination.records >= 0,
  );
}
