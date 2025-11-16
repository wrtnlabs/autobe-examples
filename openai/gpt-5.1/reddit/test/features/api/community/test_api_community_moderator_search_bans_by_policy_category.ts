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

/**
 * Verify that a community moderator can search community bans filtered by
 * policy_category.
 *
 * Business flow:
 *
 * 1. Register a platform admin and create master data:
 *
 *    - Account status via /communityPlatform/platformAdmin/accountStatuses
 *    - Community visibility level via
 *         /communityPlatform/platformAdmin/communityVisibilityLevels
 * 2. Register a member user (will own the community and be the ban target).
 * 3. Register a community moderator.
 * 4. As member user, create a community using the created visibility level.
 * 5. As community moderator, create two bans in that community for the same member
 *    user:
 *
 *    - Ban A with policy_category = "harassment"
 *    - Ban B with policy_category = "spam"
 * 6. Call PATCH
 *    /communityPlatform/communityModerator/communities/{communityIdentifier}/bans
 *    with ICommunityPlatformCommunityBan.IRequest specifying policy_category =
 *    "harassment".
 * 7. Assert that only bans with policy_category "harassment" are returned and that
 *    pagination metadata is consistent. Also, repeat for "spam" and for a
 *    non-matching category to validate empty results behavior.
 */
export async function test_api_community_moderator_search_bans_by_policy_category(
  connection: api.IConnection,
) {
  // 1. Platform admin: join and create master data (account status, visibility level)
  const platformAdminJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminJoinReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const platformAdminPassword: string = RandomGenerator.alphabets(16);

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminJoinEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorized);

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: RandomGenerator.alphabets(8),
          label: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  const visibilityCode: string = RandomGenerator.alphabets(10);

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Member user: join (used as community creator and ban target)
  const memberJoinEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const memberPassword: string = RandomGenerator.alphabets(14);

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberJoinEmail,
        password: memberPassword,
        ip: null,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  const bannedMemberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 3. Community moderator: join (actor who issues and searches bans)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const moderatorReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const moderatorPassword: string = RandomGenerator.alphabets(14);

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: null,
        ip: null,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAuthorized);

  // 4. As member user, create a community using the created visibility level
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinEmail,
      password: memberPassword,
      ip: null,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier: string = RandomGenerator.alphabets(12);

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. As community moderator, login and create two bans with different policy_category values
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const banHarassment: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: {
          memberuser_id: bannedMemberId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          policy_category: "harassment",
          started_at: null,
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banHarassment);

  const banSpam: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier,
        body: {
          memberuser_id: bannedMemberId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          policy_category: "spam",
          started_at: null,
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banSpam);

  // 6. Filter bans by policy_category = "harassment" using PATCH index
  const harassmentPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          is_active: undefined,
          started_from: null,
          started_to: null,
          expires_from: null,
          expires_to: null,
          policy_category: "harassment",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(harassmentPage);

  const harassmentPagination: IPage.IPagination = harassmentPage.pagination;
  typia.assert(harassmentPagination);

  TestValidator.predicate(
    "harassment filter returns at least one record",
    harassmentPagination.records >= 1,
  );

  TestValidator.predicate(
    "all returned bans for harassment filter have policy_category = 'harassment'",
    harassmentPage.data.every((ban) => ban.policy_category === "harassment"),
  );

  TestValidator.predicate(
    "no spam bans included in harassment filter results",
    harassmentPage.data.every((ban) => ban.policy_category !== "spam"),
  );

  // 7a. Filter bans by policy_category = "spam"
  const spamPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          is_active: undefined,
          started_from: null,
          started_to: null,
          expires_from: null,
          expires_to: null,
          policy_category: "spam",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(spamPage);

  const spamPagination: IPage.IPagination = spamPage.pagination;
  typia.assert(spamPagination);

  TestValidator.predicate(
    "spam filter returns at least one record",
    spamPagination.records >= 1,
  );

  TestValidator.predicate(
    "all returned bans for spam filter have policy_category = 'spam'",
    spamPage.data.every((ban) => ban.policy_category === "spam"),
  );

  TestValidator.predicate(
    "no harassment bans included in spam filter results",
    spamPage.data.every((ban) => ban.policy_category !== "harassment"),
  );

  // 7b. Filter with a non-matching policy_category to verify empty results
  const nonExistingCategory = "other";

  const emptyPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.communityModerator.communities.bans.index(
      connection,
      {
        communityIdentifier,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
          is_active: undefined,
          started_from: null,
          started_to: null,
          expires_from: null,
          expires_to: null,
          policy_category: nonExistingCategory,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(emptyPage);

  const emptyPagination: IPage.IPagination = emptyPage.pagination;
  typia.assert(emptyPagination);

  TestValidator.equals(
    "non-matching category should produce zero records",
    0,
    emptyPagination.records,
  );

  TestValidator.equals(
    "data array should be empty for non-matching category",
    emptyPage.data.length,
    0,
  );
}
