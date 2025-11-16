import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

export async function test_api_community_moderator_search_bans_with_temporal_filters(
  connection: api.IConnection,
) {
  /**
   * Validate temporal filtering of community bans search.
   *
   * 1. Seed platform master data (account status + visibility level) as
   *    platformAdmin.
   * 2. Register a memberUser and create a community.
   * 3. Register and login a communityModerator.
   * 4. Moderator creates two bans (A and B) in the community with distinct
   *    started_at / expires_at windows.
   * 5. Search with a started_at window that only matches Ban A.
   * 6. Search with an expires_at window that only matches Ban B.
   * 7. Search with a window matching no bans and verify empty result with
   *    consistent pagination.
   */

  // 1. platformAdmin join (auto-login) and seed master data
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
        password: "P@ssw0rd!",
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.console.example.com/join",
        referrer: "https://admin.console.example.com/",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: `ACTIVE_${RandomGenerator.alphabets(6)}`,
          label: "Active",
          description: "Active account status for testing bans.",
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public_${RandomGenerator.alphabets(6)}`,
          name: "Public Test Visibility",
          description: "Visibility level for temporal filter test community.",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 2. memberUser join and create community
  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(8)}@member.example.com`,
        password: "P@ssw0rd!",
        ip: undefined,
        href: "https://app.example.com/signup",
        referrer: "https://app.example.com/",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community_${RandomGenerator.alphabets(8)}`,
          title: "Temporal Filter Test Community",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const communityIdentifier: string = community.identifier;

  // 3. communityModerator join (auto-login) and explicit login
  const moderatorEmail = `${RandomGenerator.alphabets(8)}@moderator.example.com`;
  const moderatorPassword = "P@ssw0rd!";

  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://mod.console.example.com/join",
        referrer: "https://mod.console.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  const moderatorAuthorizedAgain: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://mod.console.example.com/login",
        referrer: "https://mod.console.example.com/",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorAuthorizedAgain);

  // 4. Moderator creates two bans (A and B) with distinct time windows
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Ban A: near-term window
  const banAStart = new Date(now.getTime() + oneDayMs).toISOString();
  const banAEnd = new Date(now.getTime() + 3 * oneDayMs).toISOString();

  // Ban B: far future window
  const banBStart = new Date(now.getTime() + 30 * oneDayMs).toISOString();
  const banBEnd = new Date(now.getTime() + 40 * oneDayMs).toISOString();

  const banA: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: {
          memberuser_id: memberJoin.id,
          reason: "Ban A for temporal filter window",
          policy_category: "test_policy_A",
          started_at: banAStart,
          expires_at: banAEnd,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banA);

  const banB: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: {
          memberuser_id: memberJoin.id,
          reason: "Ban B for temporal filter window",
          policy_category: "test_policy_B",
          started_at: banBStart,
          expires_at: banBEnd,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banB);

  // 5. Search by started_at range that only covers Ban A
  const startedRangeFrom = new Date(
    now.getTime() + 0.5 * oneDayMs,
  ).toISOString();
  const startedRangeTo = new Date(now.getTime() + 5 * oneDayMs).toISOString();

  const startedFilteredPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier,
        body: {
          page: 1,
          limit: 10,
          is_active: null,
          started_from: startedRangeFrom,
          started_to: startedRangeTo,
          expires_from: null,
          expires_to: null,
          policy_category: null,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(startedFilteredPage);

  const startedPagination: IPage.IPagination = startedFilteredPage.pagination;
  typia.assert(startedPagination);

  TestValidator.equals(
    "started_at filter - records should be 1",
    startedPagination.records,
    1,
  );
  TestValidator.equals(
    "started_at filter - pages should be 1",
    startedPagination.pages,
    1,
  );
  TestValidator.equals(
    "started_at filter - data length should be 1",
    startedFilteredPage.data.length,
    1,
  );

  const startedBanSummary: ICommunityPlatformCommunityBan.ISummary =
    startedFilteredPage.data[0];
  typia.assert(startedBanSummary);

  TestValidator.equals(
    "started_at filter - returned ban is Ban A",
    startedBanSummary.id,
    banA.id,
  );

  TestValidator.predicate(
    "Ban A starts_at within started filter window",
    startedBanSummary.starts_at >= startedRangeFrom &&
      startedBanSummary.starts_at <= startedRangeTo,
  );

  // 6. Search by expires_at range that only covers Ban B
  const expiresRangeFrom = new Date(
    now.getTime() + 29 * oneDayMs,
  ).toISOString();
  const expiresRangeTo = new Date(now.getTime() + 41 * oneDayMs).toISOString();

  const expiresFilteredPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier,
        body: {
          page: 1,
          limit: 10,
          is_active: null,
          started_from: null,
          started_to: null,
          expires_from: expiresRangeFrom,
          expires_to: expiresRangeTo,
          policy_category: null,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(expiresFilteredPage);

  const expiresPagination: IPage.IPagination = expiresFilteredPage.pagination;
  typia.assert(expiresPagination);

  TestValidator.equals(
    "expires_at filter - records should be 1",
    expiresPagination.records,
    1,
  );
  TestValidator.equals(
    "expires_at filter - pages should be 1",
    expiresPagination.pages,
    1,
  );
  TestValidator.equals(
    "expires_at filter - data length should be 1",
    expiresFilteredPage.data.length,
    1,
  );

  const expiresBanSummary: ICommunityPlatformCommunityBan.ISummary =
    expiresFilteredPage.data[0];
  typia.assert(expiresBanSummary);

  TestValidator.equals(
    "expires_at filter - returned ban is Ban B",
    expiresBanSummary.id,
    banB.id,
  );

  TestValidator.predicate(
    "Ban B ends_at within expires filter window",
    expiresBanSummary.ends_at !== null &&
      expiresBanSummary.ends_at !== undefined &&
      expiresBanSummary.ends_at >= expiresRangeFrom &&
      expiresBanSummary.ends_at <= expiresRangeTo,
  );

  // 7. Search with a range that matches no bans (far past window)
  const emptyStartedFrom = new Date(
    now.getTime() - 30 * oneDayMs,
  ).toISOString();
  const emptyStartedTo = new Date(now.getTime() - 20 * oneDayMs).toISOString();

  const emptyPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier,
        body: {
          page: 1,
          limit: 10,
          is_active: null,
          started_from: emptyStartedFrom,
          started_to: emptyStartedTo,
          expires_from: null,
          expires_to: null,
          policy_category: null,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(emptyPage);

  const emptyPagination: IPage.IPagination = emptyPage.pagination;
  typia.assert(emptyPagination);

  TestValidator.equals(
    "empty range - records should be 0",
    emptyPagination.records,
    0,
  );
  TestValidator.equals(
    "empty range - pages should be 0",
    emptyPagination.pages,
    0,
  );
  TestValidator.equals(
    "empty range - data length should be 0",
    emptyPage.data.length,
    0,
  );
}
