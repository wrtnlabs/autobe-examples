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

export async function test_api_community_ban_update_by_community_moderator_basic_flow(
  connection: api.IConnection,
) {
  // 1. Create/authenticate core actors: platformAdmin, communityModerator, memberUser.
  // platformAdmin join (also sets Authorization header for platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@platform.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console/community-platform/register",
    referrer: "https://admin.console/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  // communityModerator join
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@moderator.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://community.example.com/moderator/register",
    referrer: "https://community.example.com/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);

  // memberUser join (ban target)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@member.example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: undefined,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. As platformAdmin, create account status and visibility level master data.
  // We are already authenticated as platformAdmin from the earlier join call.

  const accountStatusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: "Active account status for testing",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(accountStatus);

  const visibilityLevelCode = `public_${RandomGenerator.alphaNumeric(4)}`;
  const visibilityLevelBody = {
    code: visibilityLevelCode,
    name: "Public",
    description: "Public visibility level for testing",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As memberUser, create a community using the created visibility level.
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: undefined,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/login-referrer",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `test-community-${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const resolvedCommunityIdentifier = community.identifier;

  // 4. As memberUser, create a membership request for that community.
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: resolvedCommunityIdentifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  TestValidator.equals(
    "membership request community id matches created community",
    membershipRequest.community.id,
    community.id,
  );

  // 5. As communityModerator, create an initial community-level ban for memberUser.
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
      ip: undefined,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com/moderator/login-referrer",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAtDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const initialExpiresAt = expiresAtDate.toISOString();

  const initialBanBody = {
    memberuser_id: memberUserId,
    reason: "initial test ban reason",
    policy_category: "spam",
    started_at: startedAt,
    expires_at: initialExpiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const initialBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: resolvedCommunityIdentifier,
        body: initialBanBody,
      },
    );
  typia.assert(initialBan);

  TestValidator.equals(
    "ban community id matches created community",
    initialBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban member user id matches target member user",
    initialBan.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "ban reason matches initial reason",
    initialBan.reason,
    initialBanBody.reason,
  );
  TestValidator.equals(
    "ban policy_category matches initial category",
    initialBan.policy_category,
    initialBanBody.policy_category,
  );

  // 6. Update the ban as the same communityModerator.
  const extendedExpiresAtDate = new Date(
    now.getTime() + 2 * 24 * 60 * 60 * 1000,
  );
  const updatedExpiresAt = extendedExpiresAtDate.toISOString();
  const updatedReason = "updated test ban reason";
  const updatedPolicyCategory = "harassment";

  const updateBanBody = {
    reason: updatedReason,
    policy_category: updatedPolicyCategory,
    expires_at: updatedExpiresAt,
    is_active: true,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;

  const updatedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.update(
      connection,
      {
        communityIdentifier: resolvedCommunityIdentifier,
        banId: initialBan.id,
        body: updateBanBody,
      },
    );
  typia.assert(updatedBan);

  // 7. Validate that mutable fields changed and identity fields remain stable.
  TestValidator.equals(
    "updated ban member user id remains unchanged",
    updatedBan.memberUser.id,
    initialBan.memberUser.id,
  );
  TestValidator.equals(
    "updated ban community id remains unchanged",
    updatedBan.community.id,
    initialBan.community.id,
  );
  TestValidator.equals(
    "updated ban reason reflects new reason",
    updatedBan.reason,
    updatedReason,
  );
  TestValidator.equals(
    "updated ban policy_category reflects new category",
    updatedBan.policy_category,
    updatedPolicyCategory,
  );

  TestValidator.predicate(
    "updated ban expires_at is extended or equal to original",
    updatedBan.expires_at !== null &&
      updatedBan.expires_at !== undefined &&
      initialBan.expires_at !== null &&
      initialBan.expires_at !== undefined &&
      updatedBan.expires_at >= initialBan.expires_at,
  );

  TestValidator.equals(
    "updated ban remains active",
    updatedBan.is_active,
    true,
  );

  // 8. Additional logical consistency checks.
  TestValidator.predicate(
    "ban started_at is not after expires_at",
    updatedBan.expires_at === null ||
      updatedBan.expires_at === undefined ||
      updatedBan.started_at <= updatedBan.expires_at,
  );

  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    updatedBan.updated_at >= updatedBan.created_at,
  );
}
