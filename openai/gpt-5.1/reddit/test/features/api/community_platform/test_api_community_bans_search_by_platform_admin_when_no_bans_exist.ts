import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

/**
 * Ensure platform-admin community ban search returns empty page when member has
 * no bans.
 *
 * Business workflow simulated:
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Platform admin creates a generic account status (dependency setup).
 * 3. Platform admin creates a community visibility level (e.g. "public").
 * 4. Member user joins and logs in.
 * 5. Member user creates a community using the visibility level.
 * 6. Member user subscribes to the community.
 * 7. Platform admin logs in again to restore admin auth context.
 * 8. Platform admin calls memberUsers.communityBans.index for that member user.
 * 9. Assert that the response is a valid empty page: data = [], records = 0, pages
 *    = 0.
 */
export async function test_api_community_bans_search_by_platform_admin_when_no_bans_exist(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated by SDK)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. Create a baseline account status as platform admin
  const accountStatusBody = {
    key: "ACTIVE_MEMBER_STATUS",
    label: "Active Member",
    description: "Default active status for community members",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdAccountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(createdAccountStatus);

  // 3. Create a community visibility level as platform admin
  const visibilityCode = "public";
  const visibilityLevelBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const createdVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(createdVisibilityLevel);

  // 4. Member user joins
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberUserId: string & tags.Format<"uuid"> =
    memberAuthorizedFromJoin.id;

  // 5. Member user logs in explicitly (to ensure session)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/login-form",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 6. Member user creates a community using the visibility level
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 7. Member user subscribes to the community
  const subscriptionCreateBody = {
    community_id: createdCommunity.id,
    status: undefined,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const createdSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: createdCommunity.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  // 8. Switch back to platform admin by logging in again
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login-form",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 9. Platform admin searches community bans for the member user (who has no bans)
  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  const banSearchBody = {
    page,
    limit,
    is_active: undefined,
    started_from: null,
    started_to: null,
    expires_from: null,
    expires_to: null,
    policy_category: null,
  } satisfies ICommunityPlatformCommunityBan.IRequest;

  const bansPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityBans.index(
      connection,
      {
        memberUserId: memberUserId,
        body: banSearchBody,
      },
    );
  typia.assert(bansPage);

  // 10. Validate empty-state expectations
  const pagination: IPage.IPagination = bansPage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "ban search pagination.records is 0 when no bans exist",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "ban search pagination.pages is 0 when no bans exist",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "ban search result data array is empty when no bans exist",
    bansPage.data.length,
    0,
  );

  TestValidator.predicate(
    "ban search pagination.current reflects a valid page index",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "ban search pagination.limit is positive",
    pagination.limit > 0,
  );
}
