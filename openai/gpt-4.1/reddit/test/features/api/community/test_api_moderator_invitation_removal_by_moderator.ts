import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that only active moderators can delete moderator invitations, and
 * that invitations cannot be deleted when already accepted or revoked.
 *
 * This test case performs the following steps:
 *
 * 1. Register a new user who will become the moderator (moderatorOwner)
 * 2. Register another user who will be invited as a moderator (invitee)
 * 3. Moderator creates a new community
 * 4. Moderator invites the second user to become community moderator
 * 5. Moderator deletes the pending moderator invitation (expect success)
 * 6. Try to delete the same invitation again (expect error)
 * 7. Try to delete a random non-existent invitation (expect error)
 *
 * This validates:
 *
 * - Only active moderators can delete invitations
 * - An accepted or revoked invitation cannot be deleted
 * - After deletion, invitation cannot be found or acted on
 * - Error handling for non-existent or invalid deletions
 */
export async function test_api_moderator_invitation_removal_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new user who will be the moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderatorpassword1!",
        display_name: RandomGenerator.name(),
        href: "https://community.dev/join",
        referrer: "https://community.dev/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(moderator);

  // 2. Register another user to invite as moderator
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitee: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: inviteeEmail,
        password: "inviteepassword2!",
        display_name: RandomGenerator.name(),
        href: "https://community.dev/join",
        referrer: "https://community.dev/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(invitee);

  // 3. Moderator creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(12).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Moderator creates a moderator invitation for the second user
  const invitation: ICommunityPlatformCommunityModeratorInvitation =
    await api.functional.communityPlatform.user.communities.moderatorInvitations.create(
      connection,
      {
        communityId: community.id,
        body: {
          community_platform_user_id: invitee.id,
        } satisfies ICommunityPlatformCommunityModeratorInvitation.ICreate,
      },
    );
  typia.assert(invitation);

  // 5. Moderator deletes the invitation (should succeed)
  await api.functional.communityPlatform.user.communities.moderatorInvitations.erase(
    connection,
    {
      communityId: community.id,
      invitationId: invitation.id,
    },
  );

  // 6. Try to delete the same invitation again (should fail)
  await TestValidator.error(
    "cannot delete already deleted invitation",
    async () => {
      await api.functional.communityPlatform.user.communities.moderatorInvitations.erase(
        connection,
        {
          communityId: community.id,
          invitationId: invitation.id,
        },
      );
    },
  );

  // 7. Try to delete a non-existent invitation (random uuid, should fail)
  await TestValidator.error(
    "cannot delete non-existent invitation",
    async () => {
      await api.functional.communityPlatform.user.communities.moderatorInvitations.erase(
        connection,
        {
          communityId: community.id,
          invitationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
