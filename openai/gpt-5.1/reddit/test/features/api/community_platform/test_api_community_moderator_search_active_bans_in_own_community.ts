import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

export async function test_api_community_moderator_search_active_bans_in_own_community(
  connection: api.IConnection,
) {
  // 1. Platform admin join and master data creation
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const accountStatusCreateBody = {
    key: "ACTIVE_MODERATOR_ACCOUNT_STATUS",
    label: "Active Moderator",
    description: "Active moderator account status for testing",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(accountStatus);

  const visibilityCode = "public-visible-" + RandomGenerator.alphaNumeric(6);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visible",
    description: "Public visibility level for testing communities",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 2. Member user join and community creation
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphabets(8),
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuth);

  const communityIdentifier =
    "test-community-" + RandomGenerator.alphaNumeric(8);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Active Ban Search",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Optional membership request creation
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 4. Community moderator join
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(8),
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuth: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuth);

  // 5. Create bans: one active, one inactive (expired)
  const now = new Date();
  const nowIso = now.toISOString();
  const futureDate = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const activeBanCreateBody = {
    memberuser_id: memberUserAuth.id,
    reason: "Active test ban for search",
    policy_category: "spam",
    started_at: nowIso,
    expires_at: futureDate,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const activeBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: activeBanCreateBody,
      },
    );
  typia.assert(activeBan);

  const inactiveBanCreateBody = {
    memberuser_id: memberUserAuth.id,
    reason: "Expired test ban for negative filter validation",
    policy_category: "abuse",
    started_at: pastStart,
    expires_at: pastEnd,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const inactiveBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: inactiveBanCreateBody,
      },
    );
  typia.assert(inactiveBan);

  // 6. Search active bans with is_active = true
  const requestPage = 1;
  const requestLimit = 10;
  const activeBansRequestBody = {
    page: requestPage as number & tags.Type<"int32">,
    limit: requestLimit as number & tags.Type<"int32">,
    is_active: true,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const activeBansPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: activeBansRequestBody,
      },
    );
  typia.assert(activeBansPage);

  const pagination = activeBansPage.pagination;
  const data = activeBansPage.data;

  // 7. Pagination and basic content validation
  TestValidator.equals(
    "active bans: current page should match requested page",
    pagination.current,
    requestPage,
  );

  TestValidator.equals(
    "active bans: limit should match requested limit",
    pagination.limit,
    requestLimit,
  );

  TestValidator.predicate(
    "active bans: there should be at least one record",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "active bans: pages should be >= 1 when there are records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  TestValidator.predicate(
    "active bans: records should not exceed limit * pages",
    pagination.records <= pagination.limit * pagination.pages,
  );

  // There must be at least one record corresponding to the activeBan
  const activeIds = data.map((ban) => ban.id);

  TestValidator.predicate(
    "active bans: page should include the explicitly created active ban id",
    activeIds.includes(activeBan.id),
  );

  // 8. Validate each returned ban summary
  for (const banSummary of data) {
    TestValidator.equals(
      "each ban in active search should be active",
      banSummary.is_active,
      true,
    );

    TestValidator.equals(
      "ban summary community id should match created community",
      banSummary.community.id,
      community.id,
    );

    TestValidator.equals(
      "ban summary member user id should match banned member user id",
      banSummary.memberUser.id,
      memberUserAuth.id,
    );
  }

  // Ensure inactive/expired ban is not returned when filtering is_active=true
  TestValidator.predicate(
    "inactive/expired ban should not appear in active-only search results",
    !activeIds.includes(inactiveBan.id),
  );

  // 9. Optional robustness check: search without is_active filter
  const allBansRequestBody = {
    page: requestPage as number & tags.Type<"int32">,
    limit: requestLimit as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const allBansPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier: community.identifier,
        body: allBansRequestBody,
      },
    );
  typia.assert(allBansPage);

  const allBanIds = allBansPage.data.map((ban) => ban.id);

  TestValidator.predicate(
    "all bans search should include the active ban",
    allBanIds.includes(activeBan.id),
  );

  TestValidator.predicate(
    "all bans search should include the inactive ban as well",
    allBanIds.includes(inactiveBan.id),
  );
}
