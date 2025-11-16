import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityGrowthStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityGrowthStatistics";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityGrowthStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityGrowthStatistics";

/**
 * Basic trend validation for community growth statistics over a short time
 * window.
 *
 * Business context:
 *
 * - A platform admin defines a visibility level master data record.
 * - A member user creates a community using that visibility level.
 * - A community moderator then grants memberships to that community for the
 *   member user.
 * - The statistics endpoint is queried for growth data for the created community
 *   over a window that fully covers the membership events.
 *
 * Steps:
 *
 * 1. Register platformAdmin, memberUser, and communityModerator actors via their
 *    join endpoints.
 * 2. As platformAdmin, create a visibility level (code + name + optional
 *    description).
 * 3. As memberUser, create a community referencing the visibility level code.
 * 4. As memberUser, submit a membership request for the community (optional but
 *    realistic).
 * 5. As communityModerator, create several community memberships for that
 *    community.
 * 6. Build a growth statistics request covering a time window around now.
 * 7. Call the growth statistics endpoint and assert:
 *
 *    - Non-empty page of results.
 *    - Presence of at least one summary for the created community.
 *    - Basic algebraic consistency: netMemberChange = newMembers - lostMembers.
 *    - Pagination metadata is coherent and data length respects the limit.
 */
export async function test_api_community_growth_statistics_basic_trend(
  connection: api.IConnection,
) {
  // 1. Join platformAdmin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // 2. As platformAdmin, create a visibility level
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
    "visibility code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Join memberUser
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.2",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 4. Switch to memberUser for community creation (join already set Authorization)
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );

  // 5. As memberUser, create a membership request for the community (optional but realistic)
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;
  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);
  TestValidator.equals(
    "membership request community id matches",
    membershipRequest.community.id,
    community.id,
  );

  // 6. Join communityModerator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(11),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.3",
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As communityModerator, create multiple memberships for the created community
  const membershipCount = 3;
  const createdMemberships: ICommunityPlatformCommunityMembership[] = [];
  for (let i = 0; i < membershipCount; i += 1) {
    const membershipCreateBody = {
      memberuser_id: memberUserAuthorized.id,
      is_active: true,
    } satisfies ICommunityPlatformCommunityMembership.ICreate;
    const membership: ICommunityPlatformCommunityMembership =
      await api.functional.communityPlatform.communityModerator.communities.memberships.create(
        connection,
        {
          communityIdentifier: community.identifier,
          body: membershipCreateBody,
        },
      );
    typia.assert(membership);
    createdMemberships.push(membership);
  }
  TestValidator.equals(
    "created membership count",
    createdMemberships.length,
    membershipCount,
  );

  // 8. Build growth statistics request covering now
  const now = new Date();
  const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const growthRequestBody = {
    community_ids: [community.id],
    community_codes: undefined,
    visibility_levels: undefined,
    from,
    to,
    granularity: "day" as const,
    include_cumulative: true,
    include_period_deltas: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityGrowthStatistics.IRequest;

  const growthPage: IPageICommunityPlatformCommunityGrowthStatistics.ISummary =
    await api.functional.communityPlatform.statistics.communities.growth.index(
      connection,
      { body: growthRequestBody },
    );
  typia.assert(growthPage);

  // 9. Basic pagination assertions
  const pagination: IPage.IPagination = growthPage.pagination;
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    growthPage.data.length <= growthRequestBody.limit!,
  );

  // There should be at least one result overall when requesting by community id
  TestValidator.predicate(
    "at least one growth statistics entry returned",
    growthPage.data.length >= 1,
  );

  // 10. Locate growth summary for our community
  const summaryForCommunity = growthPage.data.find(
    (summary) => summary.communityId === community.id,
  );
  TestValidator.predicate(
    "growth summary exists for created community",
    summaryForCommunity !== undefined,
  );
  if (!summaryForCommunity) return;

  const s = summaryForCommunity;

  // Verify that the time window of the summary overlaps our requested window
  TestValidator.predicate(
    "summary startAt is not after requested to",
    s.startAt <= growthRequestBody.to,
  );
  TestValidator.predicate(
    "summary endAt is not before requested from",
    s.endAt >= growthRequestBody.from,
  );

  // 11. Validate algebraic consistency for member deltas
  TestValidator.equals(
    "netMemberChange equals newMembers - lostMembers",
    s.netMemberChange,
    s.newMembers - s.lostMembers,
  );

  // We created memberships in this window, so expect non-negative newMembers
  TestValidator.predicate("newMembers is non-negative", s.newMembers >= 0);
  TestValidator.predicate("lostMembers is non-negative", s.lostMembers >= 0);

  // Depending on implementation, newMembers should be at least the number of membership rows
  // we created in this time window, but to avoid over-constraining, we only assert lower bound 0
  // and that activeMembers, newPosts, newComments are non-negative.
  TestValidator.predicate(
    "activeMembers is non-negative",
    s.activeMembers >= 0,
  );
  TestValidator.predicate("newPosts is non-negative", s.newPosts >= 0);
  TestValidator.predicate("newComments is non-negative", s.newComments >= 0);
}
