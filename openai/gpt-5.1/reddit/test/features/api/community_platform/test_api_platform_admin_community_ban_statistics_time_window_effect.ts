import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanStatistics";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBanStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanStatistics";

export async function test_api_platform_admin_community_ban_statistics_time_window_effect(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and get authorized context
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create account status master record
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: "Active account status for testing",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusCreateBody },
    );
  typia.assert(accountStatus);

  // 3. Create community visibility level
  const visibilityLevelCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: "Public Test Visibility",
    description: "Visibility level used for ban statistics E2E test",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Register member user and login
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  // Even though join already authorized, explicitly login once to ensure
  // login endpoint is also exercised and token context is clearly memberUser.
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create a membership request into the community
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
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

  const bannedMemberId: string & tags.Format<"uuid"> =
    membershipRequest.requesterMemberUser.id;

  // 7. Register community moderator and login
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorizedJoin);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorized);

  // 8. Prepare timestamps for bans and windows
  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;
  const msHour = 60 * 60 * 1000;

  const sevenDaysAgo = new Date(now.getTime() - 7 * msDay);
  const sevenDaysAgoMinusHour = new Date(sevenDaysAgo.getTime() - msHour);
  const oneHourAgo = new Date(now.getTime() - msHour);
  const nowPlusFiveMinutes = new Date(now.getTime() + 5 * 60 * 1000);
  const recentBanStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

  const windowStartNarrow = oneHourAgo.toISOString();
  const windowEndNarrow = nowPlusFiveMinutes.toISOString();
  const windowStartBroad = sevenDaysAgoMinusHour.toISOString();
  const windowEndBroad = nowPlusFiveMinutes.toISOString();

  // 9. Create Ban X (older ban 7 days ago)
  const banXCreateBody = {
    memberuser_id: bannedMemberId,
    reason: "Old test ban X",
    policy_category: "test_policy",
    started_at: sevenDaysAgo.toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const banX: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banXCreateBody,
      },
    );
  typia.assert(banX);

  // 10. Create Ban Y (recent ban within last hour)
  const banYCreateBody = {
    memberuser_id: bannedMemberId,
    reason: "Recent test ban Y",
    policy_category: "test_policy",
    started_at: recentBanStart.toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const banY: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banYCreateBody,
      },
    );
  typia.assert(banY);

  // 11. Switch back to platform admin context via login
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLogin);

  // 12. First statistics query: narrow window (should only include Ban Y)
  const narrowStatsRequestBody = {
    community_ids: [community.id],
    community_codes: undefined,
    banned_member_ids: undefined,
    reason_category_ids: undefined,
    statuses: undefined,
    issued_by_actor_types: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    from_effective_at: windowStartNarrow,
    to_effective_at: windowEndNarrow,
    group_by: ["community"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityBanStatistics.IRequest;

  const narrowPage: IPageICommunityPlatformCommunityBanStatistics.ISummary =
    await api.functional.communityPlatform.platformAdmin.statistics.communities.bans.index(
      connection,
      {
        body: narrowStatsRequestBody,
      },
    );
  typia.assert(narrowPage);

  // Locate stats for our community
  const narrowStatsForCommunity = narrowPage.data.find(
    (row) => row.communityId === community.id,
  );

  TestValidator.predicate(
    "narrow stats row for community must exist",
    narrowStatsForCommunity !== undefined,
  );

  if (!narrowStatsForCommunity) return;

  // Validate that only Ban Y is counted
  TestValidator.equals(
    "narrow window total bans should be 1",
    narrowStatsForCommunity.totalBans,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 13. Second statistics query: broad window (should include both Ban X and Y)
  const broadStatsRequestBody = {
    community_ids: [community.id],
    community_codes: undefined,
    banned_member_ids: undefined,
    reason_category_ids: undefined,
    statuses: undefined,
    issued_by_actor_types: undefined,
    from_created_at: undefined,
    to_created_at: undefined,
    from_effective_at: windowStartBroad,
    to_effective_at: windowEndBroad,
    group_by: ["community"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityBanStatistics.IRequest;

  const broadPage: IPageICommunityPlatformCommunityBanStatistics.ISummary =
    await api.functional.communityPlatform.platformAdmin.statistics.communities.bans.index(
      connection,
      {
        body: broadStatsRequestBody,
      },
    );
  typia.assert(broadPage);

  const broadStatsForCommunity = broadPage.data.find(
    (row) => row.communityId === community.id,
  );

  TestValidator.predicate(
    "broad stats row for community must exist",
    broadStatsForCommunity !== undefined,
  );

  if (!broadStatsForCommunity) return;

  TestValidator.equals(
    "broad window total bans should be 2",
    broadStatsForCommunity.totalBans,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // Additional sanity: broader window should not have fewer active banned members
  TestValidator.predicate(
    "broad active banned members >= narrow active banned members",
    broadStatsForCommunity.activeBannedMembers >=
      narrowStatsForCommunity.activeBannedMembers,
  );
}
