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

/**
 * Validate that deleting a non-existent community-level ban fails safely
 * without affecting existing bans.
 *
 * Business workflow:
 *
 * 1. Platform admin joins and logs in.
 * 2. Platform admin creates a visibility level and an account status.
 * 3. Member user joins, logs in, and creates a community using the created
 *    visibility level.
 * 4. Member user optionally submits a membership request to that community.
 * 5. Community moderator joins and logs in.
 * 6. Community moderator creates a valid ban against the member in that community.
 * 7. Community moderator attempts to erase a ban using a random non-existent banId
 *    and expects an error.
 * 8. Community moderator then erases the real ban successfully, proving the
 *    previous failure had no side effects.
 */
export async function test_api_community_ban_removal_fails_for_nonexistent_ban(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://platform-admin.join/",
    referrer: "https://platform-admin.referrer/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // Explicit login to ensure login flow works as well
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: undefined,
    href: "https://platform-admin.login/",
    referrer: "https://platform-admin.login.referrer/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 2. Platform admin creates visibility level and account status
  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for E2E ban tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  const accountStatusKey = `ACTIVE_${RandomGenerator.alphabets(5)}`;
  const accountStatusCreateBody = {
    key: accountStatusKey,
    label: "Active (E2E)",
    description: "Active status for E2E community ban tests.",
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

  // 3. Member user joins, logs in, and creates a community
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">,
    password: "MemberPassword123!",
    ip: undefined,
    href: "https://member.join/",
    referrer: "https://member.join.referrer/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: undefined,
    href: "https://member.login/",
    referrer: "https://member.login.referrer/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Ban Test Community",
    description: "Community used for testing non-existent ban deletion.",
    visibilityLevelCode: visibilityCreateBody.code,
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

  // 4. Member user creates a membership request in the community (optional but realistic)
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: "I want to participate in ban-related E2E testing.",
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

  // 5. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@moderator.test.com` as string &
      tags.Format<"email">,
    password: "ModeratorPassword123!",
    display_name: RandomGenerator.name(),
    ip: undefined,
    href: "https://moderator.join/",
    referrer: "https://moderator.join.referrer/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedFromJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorizedFromJoin);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: undefined,
    href: "https://moderator.login/",
    referrer: "https://moderator.login.referrer/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedFromLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedFromLogin);

  // 6. Community moderator creates a valid ban for the member
  const banCreateBody = {
    memberuser_id: memberAuthorizedFromLogin.id,
    reason: "Testing legitimate ban creation.",
    policy_category: "test_policy",
    started_at: new Date().toISOString(),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;

  const realBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.communityModerator.communities.bans.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: banCreateBody,
      },
    );
  typia.assert(realBan);

  // 7. Attempt to delete a non-existent banId
  let fakeBanId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (fakeBanId === realBan.id) {
    fakeBanId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.predicate(
    "fake ban id must differ from real ban id",
    fakeBanId !== realBan.id,
  );

  await TestValidator.error(
    "erase with non-existent banId should fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.bans.erase(
        connection,
        {
          communityIdentifier: community.identifier,
          banId: fakeBanId,
        },
      );
    },
  );

  // 8. Delete the real ban successfully to prove it still exists
  await api.functional.communityPlatform.communityModerator.communities.bans.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      banId: realBan.id,
    },
  );
}
