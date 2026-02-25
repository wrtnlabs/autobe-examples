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

export async function test_api_invitation_rejection_expiration_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // Setup inviter user
  const inviterConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Setup invitee user
  const inviteeConnection: api.IConnection = { host: connection.host };
  const inviteeJoinResponse = await authorize_user_join(inviteeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      inviterConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create invitation with short expiration
  const invitation =
    await generate_random_community_platform_moderator_communities_invitations_create(
      inviterConnection,
      {
        body: {
          invitee_id: inviteeJoinResponse.id,
          message: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(invitation);
  // Test 1: Invitee rejects invitation
  const rejectedInvitation =
    await api.functional.communityPlatform.user.invitations.update(
      inviteeConnection,
      {
        invitationId: invitation.id,
        body: {
          status: "rejected",
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  typia.assert(rejectedInvitation);
  TestValidator.equals(
    "status should be rejected",
    rejectedInvitation.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected_at should be set",
    rejectedInvitation.rejected_at !== null,
  );
  // Test 2: Attempt to modify rejected invitation (should fail)
  await TestValidator.error("cannot modify rejected invitation", async () => {
    await api.functional.communityPlatform.user.invitations.update(
      inviteeConnection,
      {
        invitationId: invitation.id,
        body: {
          status: "accepted",
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  });
  // Create new invitation that will expire
  const expiringInvitation =
    await generate_random_community_platform_moderator_communities_invitations_create(
      inviterConnection,
      {
        body: {
          invitee_id: inviteeJoinResponse.id,
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(expiringInvitation);
  // Test 3: Unauthorized user attempts to modify invitation
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  await TestValidator.error(
    "unauthorized user cannot modify invitation",
    async () => {
      await api.functional.communityPlatform.user.invitations.update(
        unauthorizedConnection,
        {
          invitationId: expiringInvitation.id,
          body: {
            status: "accepted",
          } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
        },
      );
    },
  );
  // Test 4: Attempt to modify invitation with expired status
  await TestValidator.error("cannot modify expired invitation", async () => {
    await api.functional.communityPlatform.user.invitations.update(
      inviteeConnection,
      {
        invitationId: expiringInvitation.id,
        body: {
          status: "expired",
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  });
}
