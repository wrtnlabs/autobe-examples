import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_communities_invitations_create } from "../../../generate/generate_random_community_platform_moderator_communities_invitations_create";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_invitation } from "../../../prepare/prepare_random_community_platform_community_invitation";

export async function test_api_invitation_update_message_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Create inviter (moderator) connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create invitee user connection
  const inviteeConnection: api.IConnection = { host: connection.host };
  const inviteeAuth = await authorize_user_join(inviteeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(inviteeAuth);
  // Create community using moderator connection
  const community =
    await api.functional.communityPlatform.user.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create invitation as moderator
  const invitation =
    await api.functional.communityPlatform.moderator.communities.invitations.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          invitee_id: inviteeAuth.id,
          message: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Verify initial invitation status is pending
  TestValidator.equals(
    "initial status is pending",
    invitation.status,
    "pending",
  );
  // Update invitation message and expiration time as inviter
  const updatedMessage = RandomGenerator.paragraph({ sentences: 2 });
  const futureExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedInvitation =
    await api.functional.communityPlatform.user.invitations.update(
      moderatorConnection,
      {
        invitationId: invitation.id,
        body: {
          message: updatedMessage,
          expires_at: futureExpiration,
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  typia.assert(updatedInvitation);
  // Verify updated fields
  TestValidator.equals(
    "message updated",
    updatedInvitation.message,
    updatedMessage,
  );
  TestValidator.equals(
    "expiration updated",
    updatedInvitation.expires_at,
    futureExpiration,
  );
  TestValidator.equals(
    "status remains pending",
    updatedInvitation.status,
    "pending",
  );
  // Test unauthorized access by non-inviter user
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  const unauthorizedUserAuth = await authorize_user_join(
    unauthorizedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(unauthorizedUserAuth);
  // Attempt to update invitation as unauthorized user
  await TestValidator.error(
    "unauthorized user cannot update invitation",
    async () => {
      await api.functional.communityPlatform.user.invitations.update(
        unauthorizedUserConnection,
        {
          invitationId: invitation.id,
          body: {
            message: "Unauthorized update",
          } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
        },
      );
    },
  );
  // Test that inviter cannot change status
  await TestValidator.error("inviter cannot change status", async () => {
    await api.functional.communityPlatform.user.invitations.update(
      moderatorConnection,
      {
        invitationId: invitation.id,
        body: {
          status: "accepted",
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  });
}
