import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Community moderator cannot assign a moderator role to a non-moderator /
 * non-member user.
 *
 * This E2E scenario exercises the communityModerator-facing moderator
 * assignment creation endpoint with a deliberately ineligible target actor,
 * ensuring that the service rejects attempts to assign moderator powers to
 * users who are not valid community moderators or members of the community.
 *
 * High-level business story:
 *
 * - A platform administrator prepares global account status master data.
 * - A regular member user creates a community.
 * - A community moderator account is registered and authenticated.
 * - That community moderator attempts to create a moderator assignment in the
 *   member’s community, but points the assignment at a user identity that is
 *   not a valid community moderator in that community (here we simulate this by
 *   using the memberUser’s id as the target communityModeratorId).
 * - The backend must reject this assignment attempt.
 *
 * Steps:
 *
 * 1. Register and login as platformAdmin.
 *
 *    - Call auth.platformAdmin.join with a realistic
 *         ICommunityPlatformPlatformadmin.IJoin body.
 *    - Optionally login via auth.platformAdmin.login (join already authenticates,
 *         but this confirms login path wiring is correct for subsequent admin
 *         calls).
 * 2. As platformAdmin, create at least one account status record via
 *    communityPlatform.platformAdmin.accountStatuses.create using
 *    ICommunityPlatformAccountStatus.ICreate.
 *
 *    - This ensures that account-status-related foreign keys and policies have base
 *         data.
 * 3. Register a memberUser actor via auth.memberUser.join using
 *    ICommunityPlatformMemberuser.IJoinRequest.
 *
 *    - Capture the returned ICommunityPlatformMemberuser.IAuthorized.id as
 *         memberUserId.
 * 4. While authenticated as that memberUser, create a community with
 *    communityPlatform.memberUser.communities.create and
 *    ICommunityPlatformCommunity.ICreate.
 *
 *    - Capture the returned community.identifier for later use as
 *         communityIdentifier.
 * 5. Register a communityModerator actor via auth.communityModerator.join using
 *    ICommunityPlatformCommunityModerator.IJoin.
 *
 *    - This call also authenticates as that moderator via the SDK’s header wiring.
 * 6. As the communityModerator actor, attempt to create a moderator assignment on
 *    the previously created community using
 *    communityPlatform.communityModerator.communities.moderatorAssignments.create
 *    with:
 *
 *    - CommunityIdentifier: the identifier from step 4.
 *    - Body: ICommunityPlatformCommunityModeratorAssignment.ICreate where
 *
 *         - CommunityModeratorId is set to the _memberUserId_ from step 3,
 *         - AssignedAt is a current ISO 8601 date-time string,
 *         - RevokedAt is null,
 *         - IsActive is true.
 * 7. Wrap the moderatorAssignments.create call in TestValidator.error with an
 *    async callback and await it to assert that the operation fails.
 *
 *    - We do not assert on HttpError status codes or payload structure; we only
 *         require that an error is thrown when attempting this invalid
 *         assignment.
 *
 * Expectations:
 *
 * - All join/login and creation calls (platformAdmin join, accountStatus create,
 *   memberUser join, community create, communityModerator join) succeed and
 *   return data that passes typia.assert type validation.
 * - The moderatorAssignments.create call fails and throws, satisfying
 *   TestValidator.error. This encodes the rule that communityModerator-scoped
 *   assignment creation cannot grant moderation to a user who is not a valid
 *   community moderator / member of the target community.
 */
export async function test_api_community_moderator_rejects_assignment_without_membership(
  connection: api.IConnection,
) {
  // 1. Register platformAdmin (join implicitly authenticates as platformAdmin)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1b. Login explicitly as platformAdmin to ensure login flow works and
  // to simulate fresh authentication
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // 2. As platformAdmin, create an account status master record
  const accountStatusBody = {
    key: "ACTIVE",
    label: "Active Account",
    description: "Active account status allowing full platform access.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusBody,
      },
    );
  typia.assert(createdStatus);

  // 3. Register a memberUser who will be used as an invalid target for moderator assignment
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberP@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. As that memberUser, create a community and capture its identifier
  const communityCreateBody = {
    identifier: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  const communityIdentifier: string = createdCommunity.identifier;

  // 5. Register a communityModerator actor who will attempt the invalid assignment
  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ModeratorP@ssw0rd!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 6. As the communityModerator actor, attempt to create a moderator assignment
  // using the memberUser's id as communityModeratorId (business-level invalid)
  const assignmentCreateBody = {
    communityModeratorId: memberUserId,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  await TestValidator.error(
    "community moderator assignment must fail when target user is not a valid moderator/member",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.moderatorAssignments.create(
        connection,
        {
          communityIdentifier,
          body: assignmentCreateBody,
        },
      );
    },
  );
}
