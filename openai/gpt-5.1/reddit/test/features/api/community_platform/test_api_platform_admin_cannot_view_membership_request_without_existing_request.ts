import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform admin attempts to view a non-existent community
 * membership request.
 *
 * Business intent:
 *
 * - Even when all platform configuration is present (account status master,
 *   community visibility level, community, and member user), a platform admin
 *   should not be able to successfully retrieve a membership request that does
 *   not exist for the given member user and membershipRequestId.
 *
 * Technical constraints:
 *
 * - The SDK function for the GET endpoint is typed to always return
 *   ICommunityPlatformCommunityMembershipRequest and does not expose HttpError
 *   as part of its signature, so we cannot directly assert a 404 or similar
 *   error status in this test while keeping it type-safe.
 * - Therefore, this test focuses on wiring and exercising the endpoint in a
 *   configuration where the chosen membershipRequestId is random and not
 *   associated with any created membership request, but it does not assert
 *   error responses.
 *
 * Steps:
 *
 * 1. Register a platform admin via /auth/platformAdmin/join.
 * 2. As platform admin, create an account status via
 *    /communityPlatform/platformAdmin/accountStatuses.
 * 3. As platform admin, create a community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 4. Register a member user via /auth/memberUser/join.
 * 5. Log in the member user via /auth/memberUser/login.
 * 6. As member user, create a community via
 *    /communityPlatform/memberUser/communities using the visibility level
 *    code.
 * 7. Generate a random UUID for membershipRequestId that does not correspond to
 *    any created membership request and use the real memberUser.id as the
 *    memberUserId path parameter.
 * 8. Log back in as the platform admin via /auth/platformAdmin/login.
 * 9. Call GET
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/communityMembershipRequests/{membershipRequestId}
 *    with those IDs and perform typia.assert on the response to validate the
 *    SDK-level type contract.
 */
export async function test_api_platform_admin_cannot_view_membership_request_without_existing_request(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also establishes initial admin session)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedOnJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedOnJoin);

  // 2. Create an account status master record as platform admin
  const accountStatusCreateBody = {
    key: "ACTIVE_MEMBER_STATUS",
    label: "Active Member",
    description: "Default active status for accounts.",
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

  // 3. Create a community visibility level master record as platform admin
  const visibilityLevelCode = "public-visible";
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: "Public",
    description: "Publicly visible community.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 4. Register a member user
  const memberUserEmail = typia.random<string & tags.Format<"email">>();
  const memberUserPassword = RandomGenerator.alphaNumeric(12);

  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: memberUserEmail,
    password: memberUserPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorizedOnJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorizedOnJoin);

  // 5. Log in the member user to ensure an explicit memberUser session
  const memberUserLoginBody = {
    identifier: memberUserEmail,
    password: memberUserPassword,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserAuthorizedOnLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAuthorizedOnLogin);

  // 6. As member user, create a community using the created visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode,
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

  // 7. Generate a random UUID for a non-existing membership request ID,
  //    but use the actual member user's id as memberUserId
  const nonExistingMembershipRequestId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // 8. Log back in as platform admin to ensure platformAdmin auth context
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedOnLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedOnLogin);

  // 9. Call the membership request detail endpoint with a real memberUserId
  //    but a random, non-existing membershipRequestId
  const output: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.platformAdmin.memberUsers.communityMembershipRequests.at(
      connection,
      {
        memberUserId: memberUserAuthorizedOnJoin.id,
        membershipRequestId: nonExistingMembershipRequestId,
      },
    );

  // 10. Assert the response type to ensure SDK contract is satisfied.
  typia.assert(output);
}
