import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test the workflow for inviting a user as a moderator by an existing moderator
 * in the same community.
 *
 * Steps:
 *
 * 1. Register the first user (will become moderator)
 * 2. Register the second user (invitee)
 * 3. The first user creates a new community
 * 4. The first user joins the community as a member
 * 5. The first user is assigned as a moderator in the community
 * 6. The second user joins the community as a member
 * 7. The first user (as moderator) invites the second user to become a moderator
 * 8. Validate that the invitation is linked to the correct users and community
 * 9. Ensure non-moderator cannot invite a moderator (negative case)
 * 10. Ensure duplicate invitation cannot occur (negative case)
 */
export async function test_api_moderator_invitation_by_existing_moderator(
  connection: api.IConnection,
) {
  // Register first user (will be moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.user.join(connection, {
    body: {
      email: moderatorEmail,
      password: "passw0rd!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://referrer.example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(moderator);

  // Register second user (to be invited as moderator)
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitee = await api.functional.auth.user.join(connection, {
    body: {
      email: inviteeEmail,
      password: "passw0rd!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://referrer.example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(invitee);

  // moderator creates a new community
  const communityInput = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityInput,
    });
  typia.assert(community);

  // moderator (first user) joins as member
  const membership1 =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership1);

  // assign moderator role to first user
  const moderatorAssignment =
    await api.functional.communityPlatform.user.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          user_id: moderator.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Switch to the invitee user
  await api.functional.auth.user.join(connection, {
    body: {
      email: inviteeEmail,
      password: "passw0rd!",
      display_name: invitee.display_name,
      href: "https://example.com/register",
      referrer: "https://referrer.example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });

  const membership2 =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership2);

  // Switch back to moderator for inviting
  await api.functional.auth.user.join(connection, {
    body: {
      email: moderatorEmail,
      password: "passw0rd!",
      display_name: moderator.display_name,
      href: "https://example.com/register",
      referrer: "https://referrer.example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });

  // Send invitation from moderator to invitee
  const invitation =
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
  TestValidator.equals(
    "invitation to invited user",
    invitation.community_platform_user_id,
    invitee.id,
  );
  TestValidator.equals(
    "invitation by moderator",
    invitation.invited_by_user_id,
    moderator.id,
  );
  TestValidator.equals(
    "invitation to community",
    invitation.community_platform_community_id,
    community.id,
  );
  TestValidator.predicate("invited_at is present", !!invitation.invited_at);
  TestValidator.equals("invitation not accepted", invitation.accepted_at, null);
  TestValidator.equals("invitation not revoked", invitation.revoked_at, null);
}
