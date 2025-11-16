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

export async function test_api_community_ban_removal_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin and create master data for account status & visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-" + RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Create an account status definition
  const accountStatusCreateBody = {
    key: "ACTIVE_MEMBER_STATUS_" + RandomGenerator.alphaNumeric(6),
    label: "Active Member Status",
    description:
      "Status allowing login, posting and voting for members and moderators.",
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

  // Create a community visibility level
  const visibilityCode = "public-" + RandomGenerator.alphaNumeric(6);
  const communityVisibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: communityVisibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 2. Register a member user who will own the community and later be banned
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-" + RandomGenerator.alphaNumeric(8),
    ip: null,
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As member user, create a community with the created visibility level code
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community for Ban Removal",
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "created community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 4. As member user, create a membership request in the community
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
    "membership request should be for the created community",
    membershipRequest.community.id,
    community.id,
  );

  TestValidator.equals(
    "membership requester should be the joined member user",
    membershipRequest.requesterMemberUser.id,
    memberAuthorized.id,
  );

  // 5. Register a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-" + RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/signup",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. As moderator, create a community-level ban for the member user
  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour

  const banCreateBody = {
    memberuser_id: memberAuthorized.id,
    reason: "Violation of community rules in test scenario",
    policy_category: "test_policy_category",
    started_at: startedAt,
    expires_at: expiresAt,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(ban);

  // Validate core relationships of the created ban
  TestValidator.equals(
    "ban should belong to the created community",
    ban.community.id,
    community.id,
  );

  TestValidator.equals(
    "ban should target the joined member user",
    ban.memberUser.id,
    memberAuthorized.id,
  );

  if (ban.policy_category !== null && ban.policy_category !== undefined) {
    TestValidator.equals(
      "ban policy_category should reflect request when present",
      ban.policy_category,
      banCreateBody.policy_category,
    );
  }

  if (ban.reason !== null && ban.reason !== undefined) {
    TestValidator.equals(
      "ban reason should reflect request when present",
      ban.reason,
      banCreateBody.reason,
    );
  }

  TestValidator.predicate(
    "ban should be active immediately after creation",
    ban.is_active === true,
  );

  // 7. As moderator, remove the ban using DELETE erase endpoint
  await api.functional.communityPlatform.communityModerator.communities.bans.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      banId: ban.id,
    },
  );

  // The erase endpoint returns void and no follow-up GET/list endpoint is exposed,
  // so successful completion without error is the only observable assertion.
  TestValidator.predicate(
    "ban erase operation should complete without throwing",
    true,
  );
}
