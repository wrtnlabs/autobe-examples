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

/**
 * Test that duplicate community invitations are properly prevented.
 *
 * This test validates the duplicate invitation prevention mechanism by:
 * 1. Creating a moderator account and authenticating
 * 2. Creating a community owned by the moderator
 * 3. Creating a user account to be invited
 * 4. Creating an initial invitation successfully
 * 5. Attempting to create a duplicate invitation for the same user and community
 * 6. Verifying the system detects and rejects the duplicate invitation
 */
export async function test_api_community_invitation_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as moderator
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
  // 2. Create community owned by moderator
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
  // 3. Create and authenticate as user to be invited
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // 4. Create initial invitation successfully
  const initialInvitation =
    await generate_random_community_platform_moderator_communities_invitations_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          invitee_id: user.id,
          message: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  typia.assert(initialInvitation);
  // 5. Verify initial invitation is pending
  TestValidator.equals(
    "initial invitation status",
    initialInvitation.status,
    "pending",
  );
  // 6. Attempt to create duplicate invitation and verify error
  await TestValidator.error("duplicate invitation should fail", async () => {
    await generate_random_community_platform_moderator_communities_invitations_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          invitee_id: user.id,
          message: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  });
  // 7. Validate that the initial invitation remains unchanged
  TestValidator.equals(
    "invitee matches",
    initialInvitation.invitee.id,
    user.id,
  );
  TestValidator.equals(
    "community matches",
    initialInvitation.community.id,
    community.id,
  );
  TestValidator.equals(
    "inviter matches",
    initialInvitation.inviter.id,
    moderator.id,
  );
}
