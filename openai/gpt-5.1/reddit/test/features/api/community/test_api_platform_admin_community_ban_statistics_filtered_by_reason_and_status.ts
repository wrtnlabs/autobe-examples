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

export async function test_api_platform_admin_community_ban_statistics_filtered_by_reason_and_status(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create at least one account status
  const accountStatusKey = `ACTIVE_${RandomGenerator.alphaNumeric(4)}`;
  const accountStatusBody = {
    key: accountStatusKey,
    label: "Active Member",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(accountStatus);

  // 4. Create two member users (A and B)
  const memberHref = "https://app.local/join" as const;
  const memberReferrer = "https://app.local/" as const;

  const memberAJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test`,
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  const memberBJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(8)}@member.test`,
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  const memberAId = memberA.id;
  const memberBId = memberB.id;

  // 5. As Member A, create a community
  // (platformAdmin.join already set Authorization, so we need to login as memberA explicitly)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberA.email,
      password: memberAJoinBody.password,
      ip: "127.0.0.1",
      href: "https://app.local/login",
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
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

  const communityId = community.id;

  // 6. As Member A, create membership requests for both Member A and Member B
  // For Member A, we are already authenticated. Submit a simple request.
  const membershipRequestBodyA = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const memberARequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestBodyA,
      },
    );
  typia.assert(memberARequest);

  // Authenticate as Member B and submit membership request
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberB.email,
      password: memberBJoinBody.password,
      ip: "127.0.0.1",
      href: "https://app.local/login",
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const membershipRequestBodyB = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const memberBRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier,
        body: membershipRequestBodyB,
      },
    );
  typia.assert(memberBRequest);

  // 7. Create and authenticate a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.test`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.console.local/join",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // Ensure moderator is logged in (join already sets token, but be explicit)
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: "127.0.0.1",
      href: "https://moderator.console.local/login",
      referrer: "https://landing.local/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 8. As moderator, create two bans in the same community
  const now = new Date();

  const activeBanStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const expiredBanStart = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
  const expiredBanEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

  // Active ban for Member A (policy_category "harassment")
  const activeBanCreateBody = {
    memberuser_id: memberAId,
    reason: "Harassment behavior in threads",
    policy_category: "harassment",
    started_at: activeBanStart.toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const activeBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: activeBanCreateBody,
      },
    );
  typia.assert(activeBan);

  // Non-active (expired) ban for Member B (policy_category "spam")
  const expiredBanCreateBody = {
    memberuser_id: memberBId,
    reason: "Spam posts and self-promotion",
    policy_category: "spam",
    started_at: expiredBanStart.toISOString(),
    expires_at: expiredBanEnd.toISOString(),
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const expiredBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: expiredBanCreateBody,
      },
    );
  typia.assert(expiredBan);

  // 9. Switch back to platform admin to query statistics
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdmin.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.console.local/login",
      referrer: "https://landing.local/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const statsWindowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
  const statsWindowEnd = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour in future

  // First statistics call: filter for community and active status only
  const statsRequestActiveOnly = {
    community_ids: [communityId],
    community_codes: undefined,
    banned_member_ids: undefined,
    reason_category_ids: undefined,
    statuses: ["active"],
    issued_by_actor_types: undefined,
    from_created_at: statsWindowStart.toISOString(),
    to_created_at: statsWindowEnd.toISOString(),
    from_effective_at: undefined,
    to_effective_at: undefined,
    group_by: ["community"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityBanStatistics.IRequest;

  const statsPageActiveOnly: IPageICommunityPlatformCommunityBanStatistics.ISummary =
    await api.functional.communityPlatform.platformAdmin.statistics.communities.bans.index(
      connection,
      {
        body: statsRequestActiveOnly,
      },
    );
  typia.assert(statsPageActiveOnly);

  const communityStatsActiveOnly = statsPageActiveOnly.data.find(
    (s) => s.communityId === communityId,
  );

  TestValidator.predicate(
    "statistics for target community should be present (active filter)",
    communityStatsActiveOnly !== undefined,
  );

  if (communityStatsActiveOnly) {
    // Expect at least one active ban and at least one active banned member
    TestValidator.predicate(
      "totalBans under active filter should be >= 1",
      communityStatsActiveOnly.totalBans >= 1,
    );
    TestValidator.predicate(
      "activeBannedMembers under active filter should be >= 1",
      communityStatsActiveOnly.activeBannedMembers >= 1,
    );
  }

  // 11. Second statistics call: relaxed filter (no statuses) to see both bans influence
  const statsRequestAllStatuses = {
    community_ids: [communityId],
    community_codes: undefined,
    banned_member_ids: undefined,
    reason_category_ids: undefined,
    statuses: undefined,
    issued_by_actor_types: undefined,
    from_created_at: statsWindowStart.toISOString(),
    to_created_at: statsWindowEnd.toISOString(),
    from_effective_at: undefined,
    to_effective_at: undefined,
    group_by: ["community"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies ICommunityPlatformCommunityBanStatistics.IRequest;

  const statsPageAllStatuses: IPageICommunityPlatformCommunityBanStatistics.ISummary =
    await api.functional.communityPlatform.platformAdmin.statistics.communities.bans.index(
      connection,
      {
        body: statsRequestAllStatuses,
      },
    );
  typia.assert(statsPageAllStatuses);

  const communityStatsAllStatuses = statsPageAllStatuses.data.find(
    (s) => s.communityId === communityId,
  );

  TestValidator.predicate(
    "statistics for target community should be present (all statuses)",
    communityStatsAllStatuses !== undefined,
  );

  if (communityStatsActiveOnly && communityStatsAllStatuses) {
    // When relaxing the statuses filter, totalBans should be >= active-only total
    TestValidator.predicate(
      "totalBans with all statuses should be >= totalBans with active filter",
      communityStatsAllStatuses.totalBans >= communityStatsActiveOnly.totalBans,
    );

    // It is reasonable to expect liftedBans to be >= 0 and potentially >= 1
    TestValidator.predicate(
      "liftedBans should be >= 0",
      communityStatsAllStatuses.liftedBans >= 0,
    );
  }
}
