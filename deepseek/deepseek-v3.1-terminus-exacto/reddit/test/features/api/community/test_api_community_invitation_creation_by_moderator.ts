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

export async function test_api_community_invitation_creation_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderator);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
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
  // Create user connection and account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create invitation
  const invitation =
    await generate_random_community_platform_moderator_communities_invitations_create(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          invitee_id: user.id,
          message: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Validate invitation details
  TestValidator.equals(
    "invitation status should be pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "community ID should match",
    invitation.community.id,
    community.id,
  );
  TestValidator.equals(
    "invitee ID should match",
    invitation.invitee.id,
    user.id,
  );
  TestValidator.equals(
    "inviter ID should match",
    invitation.inviter.id,
    moderator.id,
  );
  TestValidator.predicate(
    "expiration timestamp should be set",
    invitation.expires_at !== null,
  );
  TestValidator.predicate(
    "created at timestamp should be set",
    invitation.created_at !== null,
  );
  TestValidator.predicate(
    "updated at timestamp should be set",
    invitation.updated_at !== null,
  );
  TestValidator.equals(
    "accepted at should be null for pending invitation",
    invitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "rejected at should be null for pending invitation",
    invitation.rejected_at,
    null,
  );
}
