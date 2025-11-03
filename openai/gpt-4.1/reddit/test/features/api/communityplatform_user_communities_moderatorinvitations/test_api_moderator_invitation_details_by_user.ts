import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate community moderator invitation detail access by moderator and
 * restriction for non-moderator/unauthenticated users.
 *
 * 1. Register and authenticate User A
 * 2. User A creates a community
 * 3. Register and authenticate User B
 * 4. Attempt to get moderator invitation details by User A (should succeed)
 * 5. Attempt to get moderator invitation details by User B (should fail - is not
 *    moderator)
 * 6. Attempt to get details unauthenticated (should fail)
 */
export async function test_api_moderator_invitation_details_by_user(
  connection: api.IConnection,
) {
  // Register User A and authenticate
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userA_email,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userA);

  // User A creates a community
  const communityReq = {
    name: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityReq,
    });
  typia.assert(community);

  // Register User B and authenticate
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userB_email,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userB);

  // Simulate an existing moderator invitation record (no API to create one)
  // Use typia.random but ensure it matches correct community/user A as inviter/user B as invitee
  const invitation: ICommunityPlatformCommunityModeratorInvitation = {
    id: typia.random<string & tags.Format<"uuid">>(),
    community_platform_user_id: userB.id,
    community_platform_community_id: community.id,
    invited_by_user_id: userA.id,
    invited_at: new Date().toISOString(),
    accepted_at: null,
    revoked_at: null,
  };

  // 4. User A requests the invitation details (should succeed)
  const invitationDetail =
    await api.functional.communityPlatform.user.communities.moderatorInvitations.at(
      connection,
      {
        communityId: invitation.community_platform_community_id,
        invitationId: invitation.id,
      },
    );
  typia.assert(invitationDetail);
  TestValidator.equals(
    "community id matches",
    invitationDetail.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "invitee user id matches",
    invitationDetail.community_platform_user_id,
    userB.id,
  );
  TestValidator.equals(
    "inviter user id matches",
    invitationDetail.invited_by_user_id,
    userA.id,
  );
  TestValidator.equals(
    "invited_at matches",
    invitationDetail.invited_at,
    invitation.invited_at,
  );

  // 5. User B requests the invitation detail (should fail)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userA_email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  }); // User A re-login to ensure token content

  await api.functional.auth.user.join(connection, {
    body: {
      email: userB_email,
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies ICommunityPlatformUser.IJoin,
  });

  await TestValidator.error(
    "non-moderator user cannot access invitation detail",
    async () => {
      await api.functional.communityPlatform.user.communities.moderatorInvitations.at(
        connection,
        {
          communityId: invitation.community_platform_community_id,
          invitationId: invitation.id,
        },
      );
    },
  );

  // 6. Unauthenticated request (connection with cleared headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request should be denied",
    async () => {
      await api.functional.communityPlatform.user.communities.moderatorInvitations.at(
        unauthConn,
        {
          communityId: invitation.community_platform_community_id,
          invitationId: invitation.id,
        },
      );
    },
  );
}
