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

export async function test_api_community_moderator_views_active_community_ban_detail(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuth = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuth);

  // 2. Platform admin creates an account status
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active",
    description: "Active account status for general users and moderators.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const accountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(accountStatus);

  // 3. Platform admin creates a visibility level
  const visibilityCode = `public_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Public community visibility level for open communities.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: "MemberP@ssw0rd!",
    ip: RandomGenerator.mobile(),
    href: "https://app.local/signup",
    referrer: "https://app.local",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);

  const memberUserId = memberAuth.id;

  // 5. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Member user optionally creates a membership request
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert(membershipRequest);

  // 7. Community moderator joins
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.test.com` as string &
      tags.Format<"email">,
    password: "ModeratorP@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://mod.console.local/join",
    referrer: "https://mod.console.local",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuth = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: communityModeratorJoinBody,
    },
  );
  typia.assert(moderatorAuth);

  const moderatorId = moderatorAuth.id;
  TestValidator.predicate(
    "community moderator id should be a non-empty uuid",
    typeof moderatorId === "string" && moderatorId.length > 0,
  );

  // 8. Moderator creates a community-level ban for the member user
  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const banCreateBody = {
    memberuser_id: memberUserId,
    reason: "Violation of community rules in test scenario.",
    policy_category: "test_policy",
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const createdBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(createdBan);

  TestValidator.equals(
    "created ban member user id should match target member",
    createdBan.memberUser.id,
    memberUserId,
  );

  TestValidator.predicate(
    "created ban should be active",
    createdBan.is_active === true,
  );

  // 9. Moderator fetches the ban detail by member user id and ban id
  const fetchedBan =
    await api.functional.communityPlatform.communityModerator.memberUsers.communityBans.at(
      connection,
      {
        memberUserId: memberUserId,
        banId: createdBan.id,
      },
    );
  typia.assert(fetchedBan);

  // 10. Business-level validations
  TestValidator.equals(
    "ban id in detail should match created ban id",
    fetchedBan.id,
    createdBan.id,
  );

  TestValidator.equals(
    "fetched ban's member user should match original member",
    fetchedBan.memberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "fetched ban's community id should match created community id",
    fetchedBan.community.id,
    community.id,
  );

  TestValidator.predicate(
    "fetched ban should be active",
    fetchedBan.is_active === true,
  );

  TestValidator.equals(
    "fetched ban started_at should equal creation payload",
    fetchedBan.started_at,
    startedAt,
  );

  TestValidator.equals(
    "fetched ban expires_at should equal creation payload",
    fetchedBan.expires_at,
    expiresAt,
  );

  TestValidator.predicate(
    "fetched ban created_at should be a non-empty string",
    typeof fetchedBan.created_at === "string" &&
      fetchedBan.created_at.length > 0,
  );

  TestValidator.predicate(
    "fetched ban updated_at should be a non-empty string",
    typeof fetchedBan.updated_at === "string" &&
      fetchedBan.updated_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at lexicographically",
    fetchedBan.updated_at >= fetchedBan.created_at,
  );
}
