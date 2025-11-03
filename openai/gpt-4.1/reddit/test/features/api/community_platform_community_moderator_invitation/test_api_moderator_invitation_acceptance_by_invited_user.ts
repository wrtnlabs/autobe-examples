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
 * This test validates that a user invited to be a moderator in a community can
 * successfully accept the invitation, resulting in their role elevation and the
 * proper transition of the invitation status.
 *
 * Step-by-step process:
 *
 * 1. Register user1 (who will be the initial moderator).
 * 2. Register user2 (who will be invited).
 * 3. As user1, create a community.
 * 4. As user1, join the community as a member.
 * 5. As user1, assign themselves as community moderator.
 * 6. As user2, join the community as a member.
 * 7. As user1, send a moderator invitation to user2.
 * 8. As user2, accept the invitation.
 * 9. Assert that the invitation now has an accepted_at timestamp.
 * 10. Assert that user2 has been elevated to moderator status in the community.
 */
export async function test_api_moderator_invitation_acceptance_by_invited_user(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1Email: string = typia.random<string & tags.Format<"email">>();
  const user1Password: string = RandomGenerator.alphaNumeric(12);
  const user1JoinReq = {
    email: user1Email,
    password: user1Password,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://test.origin/register",
    referrer: "https://test.origin/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user1: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: user1JoinReq });
  typia.assert(user1);

  // 2. Register user2
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const user2Email: string = typia.random<string & tags.Format<"email">>();
  const user2Password: string = RandomGenerator.alphaNumeric(12);
  const user2JoinReq = {
    email: user2Email,
    password: user2Password,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://test.origin/register",
    referrer: "https://test.origin/landing",
  } satisfies ICommunityPlatformUser.IJoin;
  const user2: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(unauthConn, { body: user2JoinReq });
  typia.assert(user2);

  // 3. As user1, create a community
  // (User1 is still logged in on `connection`)
  const commCreateReq = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: commCreateReq,
    });
  typia.assert(community);

  // 4. As user1, join the community
  const membership1: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      { communityId: community.id, body: {} },
    );
  typia.assert(membership1);

  // 5. As user1, assign themselves as moderator
  const moderator1: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.user.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: { user_id: user1.id },
      },
    );
  typia.assert(moderator1);
  TestValidator.equals(
    "moderator1's user id matches user1",
    moderator1.user.id,
    user1.id,
  );
  TestValidator.equals(
    "moderator1's community id matches",
    moderator1.community.id,
    community.id,
  );

  // 6. As user2, login and join the community
  await api.functional.auth.user.join(unauthConn, { body: user2JoinReq });
  const membership2: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      unauthConn,
      { communityId: community.id, body: {} },
    );
  typia.assert(membership2);

  // 7. As user1, login and send moderator invitation to user2
  await api.functional.auth.user.join(connection, { body: user1JoinReq }); // ensure token switch
  const invitationReq = {
    community_platform_user_id: user2.id,
  } satisfies ICommunityPlatformCommunityModeratorInvitation.ICreate;
  const invitation: ICommunityPlatformCommunityModeratorInvitation =
    await api.functional.communityPlatform.user.communities.moderatorInvitations.create(
      connection,
      { communityId: community.id, body: invitationReq },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation's community id matches",
    invitation.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "invitation's user id matches user2",
    invitation.community_platform_user_id,
    user2.id,
  );

  // 8. As user2, login and accept the invitation
  await api.functional.auth.user.join(unauthConn, { body: user2JoinReq }); // ensure token switch
  const acceptReq = {
    accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityModeratorInvitation.IUpdate;
  const updatedInvitation: ICommunityPlatformCommunityModeratorInvitation =
    await api.functional.communityPlatform.user.communities.moderatorInvitations.update(
      unauthConn,
      {
        communityId: community.id,
        invitationId: invitation.id,
        body: acceptReq,
      },
    );
  typia.assert(updatedInvitation);
  TestValidator.predicate(
    "invitation should have accepted_at set",
    updatedInvitation.accepted_at !== null &&
      updatedInvitation.accepted_at !== undefined,
  );
  TestValidator.equals(
    "invitation's user id matches user2 after acceptance",
    updatedInvitation.community_platform_user_id,
    user2.id,
  );

  // 9. As user2, verify moderator role by attempting to assign (idempotency check)
  const modCreateReq = {
    user_id: user2.id,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderator2: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.user.communities.moderators.create(
      unauthConn,
      {
        communityId: community.id,
        body: modCreateReq,
      },
    );
  typia.assert(moderator2);
  TestValidator.equals(
    "user2 moderator's user id matches user2",
    moderator2.user.id,
    user2.id,
  );
  TestValidator.equals(
    "user2 moderator's community id matches",
    moderator2.community.id,
    community.id,
  );
}
