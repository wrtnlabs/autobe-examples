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
 * Test invitation creation failures for invalid scenarios. Covers:
 * 1) Moderator authenticates and creates community
 * 2) Attempt to invite non-existent user - should fail
 * 3) Regular user (non-moderator) attempts invitation - should fail due to authorization
 */
export async function test_api_community_invitation_invalid_target(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(10),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  // 4. Test: Attempt to invite a non-existent user
  await TestValidator.error("fail to invite non-existent user", async () => {
    const nonExistentId = typia.random<string & tags.Format<"uuid">>();
    await api.functional.communityPlatform.moderator.communities.invitations.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          invitee_id: nonExistentId,
          message: null,
        } satisfies ICommunityPlatformCommunityInvitation.ICreate,
      },
    );
  });
  // 5. Test: Regular user (non-moderator) attempts invitation - authorization failure
  await TestValidator.error(
    "fail when regular user attempts invitation",
    async () => {
      await api.functional.communityPlatform.moderator.communities.invitations.create(
        userConnection,
        {
          communityId: community.id,
          body: {
            invitee_id: typia.random<string & tags.Format<"uuid">>(),
            message: null,
          } satisfies ICommunityPlatformCommunityInvitation.ICreate,
        },
      );
    },
  );
}
