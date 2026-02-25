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

export async function test_api_invitation_acceptance_auto_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create community as moderator
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create inviter user connection
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviter = await authorize_user_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(inviter);
  // Create invitee user connection
  const inviteeConnection: api.IConnection = { host: connection.host };
  const invitee = await authorize_user_join(inviteeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(invitee);
  // Create invitation as moderator
  const invitation =
    await generate_random_community_platform_moderator_communities_invitations_create(
      moderatorConnection,
      {
        body: {
          invitee_id: invitee.id,
          message: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(invitation);
  // Verify invitation is in pending status
  TestValidator.equals(
    "invitation status should be pending",
    invitation.status,
    "pending",
  );
  TestValidator.predicate(
    "invitation should not have accepted_at timestamp",
    invitation.accepted_at === null,
  );
  // Accept invitation as invitee
  const updatedInvitation =
    await api.functional.communityPlatform.user.invitations.update(
      inviteeConnection,
      {
        invitationId: invitation.id,
        body: {
          status: "accepted",
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  typia.assert(updatedInvitation);
  // Verify invitation acceptance
  TestValidator.equals(
    "invitation status should be accepted",
    updatedInvitation.status,
    "accepted",
  );
  TestValidator.predicate(
    "invitation should have accepted_at timestamp",
    updatedInvitation.accepted_at !== null,
  );
  TestValidator.predicate(
    "accepted_at should be a valid date",
    new Date(updatedInvitation.accepted_at!).getTime() > 0,
  );
  TestValidator.equals(
    "community ID should match",
    updatedInvitation.community.id,
    community.id,
  );
  TestValidator.equals(
    "invitee ID should match",
    updatedInvitation.invitee.id,
    invitee.id,
  );
  TestValidator.equals(
    "inviter ID should match",
    updatedInvitation.inviter.id,
    inviter.id,
  );
  // Test that non-invitee cannot accept the invitation
  await TestValidator.error(
    "non-invitee should not be able to accept invitation",
    async () => {
      await api.functional.communityPlatform.user.invitations.update(
        inviterConnection,
        {
          invitationId: invitation.id,
          body: {
            status: "accepted",
          } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
        },
      );
    },
  );
  // Test that expired invitation cannot be accepted (simulate by setting status to expired)
  const expiredInvitationUpdate =
    await api.functional.communityPlatform.user.invitations.update(
      moderatorConnection,
      {
        invitationId: invitation.id,
        body: {
          status: "expired",
        } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
      },
    );
  typia.assert(expiredInvitationUpdate);
  await TestValidator.error(
    "expired invitation should not be accepted",
    async () => {
      await api.functional.communityPlatform.user.invitations.update(
        inviteeConnection,
        {
          invitationId: invitation.id,
          body: {
            status: "accepted",
          } satisfies ICommunityPlatformCommunityInvitation.IUpdate,
        },
      );
    },
  );
}
