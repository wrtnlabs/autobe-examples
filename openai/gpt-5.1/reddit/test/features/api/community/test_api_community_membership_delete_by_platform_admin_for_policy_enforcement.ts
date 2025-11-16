import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can force-delete a community
 * membership for policy or safety enforcement, even though the membership was
 * created through the normal memberUser → membershipRequest →
 * communityModerator approval flow.
 *
 * Business flow:
 *
 * 1. A platform admin exists and defines a visibility level that can be used when
 *    communities are created.
 * 2. A member user joins the platform and creates a community using that
 *    visibility level.
 * 3. The same member user requests membership in that community via the
 *    membershipRequests endpoint (simulating a gated community policy).
 * 4. A community moderator registers and, acting in moderator context,
 *    materializes the membership via the moderator memberships.create API.
 * 5. Later, as part of a global policy decision, the platform admin logs in again
 *    and deletes that membership via the platformAdmin
 *    communities.memberships.erase endpoint.
 *
 * Test goals:
 *
 * - Ensure that all three actor types (platformAdmin, memberUser,
 *   communityModerator) can be authenticated and that the SDK correctly
 *   switches Authorization context between them.
 * - Verify that a community can be created by a member user using a visibility
 *   level defined by a platform admin.
 * - Confirm that a membership request can be created and then turned into an
 *   active membership by a community moderator.
 * - Validate that the platform admin can delete the resulting membership via
 *   DELETE
 *   /communityPlatform/platformAdmin/communities/{communityIdentifier}/memberships/{membershipId}
 *   without error.
 *
 * Due to the absence of membership read/index APIs for post-deletion
 * verification in the provided SDK surface, the test restricts assertions to:
 *
 * - Strong type assertions on all creation responses using typia.assert().
 * - Ensuring the membership is created (has a UUID id, joined_at, is_active)
 *   before deletion.
 * - Ensuring the erase call completes successfully (no exception is thrown when
 *   awaited).
 */
export async function test_api_community_membership_delete_by_platform_admin_for_policy_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (join) and obtain immediate authenticated context.
  const platformAdminJoinInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinInput,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorizedFromJoin,
  );

  // 2. As platform admin, create a community visibility level that can be reused.
  const visibilityLevelCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityLevelCode,
    name: "Test Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "created visibility level code should match request code",
    visibilityLevel.code,
    visibilityLevelCode,
  );

  // 3. Register a member user and switch context to memberUser actor.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As this member user, create a community using the visibility level code.
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
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
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier should match creation request",
    community.identifier,
    communityIdentifier,
  );

  // 5. As the same member user, create a membership request for that community.
  const membershipRequestBody = {
    questionKey: "why_join",
    answerText: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const membershipRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipRequestBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembershipRequest>(membershipRequest);
  TestValidator.equals(
    "membership request community id should match created community",
    membershipRequest.community.id,
    community.id,
  );

  // 6. Register a community moderator and switch context to communityModerator.
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/register",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 7. As community moderator, create an active membership for the member user.
  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.communityModerator.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);
  TestValidator.equals(
    "created membership should be active before deletion",
    membership.is_active,
    true,
  );
  TestValidator.equals(
    "created membership member user id should match requester",
    membership.memberuser.id,
    membershipCreateBody.memberuser_id,
  );
  const membershipId: string & tags.Format<"uuid"> = membership.id;

  // 8. Switch back to platform admin context using login.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinInput.email,
    password: platformAdminJoinInput.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorizedFromLogin,
  );
  TestValidator.equals(
    "platform admin id should remain consistent between join and login",
    platformAdminAuthorizedFromLogin.id,
    platformAdminAuthorizedFromJoin.id,
  );

  // 9. As platform admin, delete the membership for policy enforcement.
  await api.functional.communityPlatform.platformAdmin.communities.memberships.erase(
    connection,
    {
      communityIdentifier: community.identifier,
      membershipId,
    },
  );

  // 10. Since no read APIs are provided for membership after deletion,
  // we assert only that the delete call completed without throwing.
  TestValidator.predicate(
    "platform admin membership erase should complete without throwing",
    true,
  );
}
