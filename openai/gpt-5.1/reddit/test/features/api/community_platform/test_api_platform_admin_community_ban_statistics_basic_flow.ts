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

/**
 * Validate basic flow for community ban statistics for a platform admin.
 *
 * This scenario walks through:
 *
 * 1. Platform admin registration and authentication.
 * 2. Creation of community visibility level and account status master data.
 * 3. Member user registration and community creation using the visibility level.
 * 4. Member user submitting a membership request to that community.
 * 5. Community moderator registration and creation of a ban for that member in the
 *    community.
 * 6. Platform admin querying community ban statistics filtered to that community.
 *
 * Expectations:
 *
 * - Statistics call returns at least one summary row for the created community.
 * - For that summary, totalBans >= 1.
 * - Pagination metadata is internally consistent with the size of the data array.
 */
export async function test_api_platform_admin_community_ban_statistics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join implicitly authenticates as platformAdmin)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminUsername: string = RandomGenerator.alphabets(12);
  const platformAdminPassword: string = "P@ssw0rd!";
  const platformAdminJoinHref: string & tags.Format<"uri"> =
    "https://admin.example.com/join" as string & tags.Format<"uri">;
  const platformAdminJoinReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com/landing" as string & tags.Format<"uri">;

  const platformAdminAuthorizedOnJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: platformAdminUsername,
        email: platformAdminEmail,
        password: platformAdminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminAuthorizedOnJoin);

  // 2. As platform admin, create visibility level master data
  const visibilityCode = "public-" + RandomGenerator.alphaNumeric(6);
  const visibilityName = "Public " + RandomGenerator.name(1);

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: visibilityName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platform admin, create an ACTIVE account status master entry
  const accountStatusKey = "ACTIVE_" + RandomGenerator.alphaNumeric(6);
  const accountStatusLabel = "Active " + RandomGenerator.name(1);

  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: {
          key: accountStatusKey,
          label: accountStatusLabel,
          description: "Active accounts can login, post, and vote.",
          isLoginAllowed: true,
          isPostingAllowed: true,
          isVotingAllowed: true,
          requiresManualReview: false,
        } satisfies ICommunityPlatformAccountStatus.ICreate,
      },
    );
  typia.assert(accountStatus);

  // 4. Register a member user (join implicitly authenticates as memberUser)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberPassword: string = "M3mberP@ss";
  const memberHref: string & tags.Format<"uri"> =
    "https://app.example.com/signup" as string & tags.Format<"uri">;
  const memberReferrer: string & tags.Format<"uri"> =
    "https://app.example.com/home" as string & tags.Format<"uri">;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: null,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 5. As member user, create a community referencing the visibility level code
  const communityIdentifier = "community-" + RandomGenerator.alphaNumeric(8);
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityCode,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. As member user, create a membership request to the community
  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          questionKey: "why_join",
          answerText: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate,
      },
    );
  typia.assert(membershipRequest);

  // 7. Register a community moderator (join authenticates as communityModerator)
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorUsername: string = RandomGenerator.alphabets(10);
  const moderatorPassword: string = "ModP@ssw0rd";
  const moderatorHref: string & tags.Format<"uri"> =
    "https://moderator.example.com/join" as string & tags.Format<"uri">;
  const moderatorReferrer: string & tags.Format<"uri"> =
    "https://moderator.example.com" as string & tags.Format<"uri">;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAuthorized);

  // 8. As community moderator, create a ban for the member in the community
  const now = new Date();
  const startedAt = now.toISOString();

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: {
          memberuser_id: memberAuthorized.id,
          reason: "Test ban for statistics e2e",
          policy_category: "test_policy",
          started_at: startedAt,
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // 9. Switch back to platform admin via login
  const platformAdminLoginHref: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const platformAdminLoginReferrer: string & tags.Format<"uri"> =
    "https://admin.example.com" as string & tags.Format<"uri">;

  const platformAdminAuthorizedOnLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: platformAdminPassword,
        ip: null,
        href: platformAdminLoginHref,
        referrer: platformAdminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminAuthorizedOnLogin);

  // 10. As platform admin, query community ban statistics filtered to the community
  const fromCreatedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const toCreatedAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  const statsPage: IPageICommunityPlatformCommunityBanStatistics.ISummary =
    await api.functional.communityPlatform.platformAdmin.statistics.communities.bans.index(
      connection,
      {
        body: {
          community_ids: [community.id],
          community_codes: undefined,
          banned_member_ids: undefined,
          reason_category_ids: undefined,
          statuses: undefined,
          issued_by_actor_types: ["communityModerator"],
          from_created_at: fromCreatedAt,
          to_created_at: toCreatedAt,
          from_effective_at: undefined,
          to_effective_at: undefined,
          group_by: ["community"],
          page,
          limit,
        } satisfies ICommunityPlatformCommunityBanStatistics.IRequest,
      },
    );
  typia.assert(statsPage);

  const pagination: IPage.IPagination = statsPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 11. Assertions on pagination consistency
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination.records should be >= number of data items",
    pagination.records >= statsPage.data.length,
  );

  if (pagination.pages === 0) {
    TestValidator.equals(
      "when pages is 0, records must be 0",
      pagination.records,
      0,
    );
    TestValidator.equals(
      "when pages is 0, data must be empty",
      statsPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when pages > 0, records must be > 0",
      pagination.records > 0,
    );
  }

  // Ensure at least one statistics summary exists
  TestValidator.predicate(
    "statistics data should contain at least one summary",
    statsPage.data.length >= 1,
  );

  // Find summary for our community
  const summaryForCommunity:
    | ICommunityPlatformCommunityBanStatistics.ISummary
    | undefined = statsPage.data.find(
    (summary) => summary.communityId === community.id,
  );

  TestValidator.predicate(
    "statistics should contain a summary entry for the created community",
    summaryForCommunity !== undefined,
  );

  if (summaryForCommunity !== undefined) {
    typia.assert<ICommunityPlatformCommunityBanStatistics.ISummary>(
      summaryForCommunity,
    );

    TestValidator.predicate(
      "totalBans for the community should be at least 1",
      summaryForCommunity.totalBans >= 1,
    );
  }
}
