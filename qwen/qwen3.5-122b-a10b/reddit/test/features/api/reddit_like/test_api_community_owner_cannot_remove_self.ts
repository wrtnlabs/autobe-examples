import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test that community owners cannot remove themselves as moderators.
 *
 * Validates the business rule preventing community owners from removing their own moderator status. The owner creates a community, becomes a moderator, and then attempts to remove themselves. This operation must fail with a 400 Bad Request error.
 *
 * 1. Register and authenticate a new member as community owner.
 * 2. Owner creates a new community.
 * 3. Owner adds themselves as a moderator to their own community.
 * 4. Owner attempts to remove themselves as moderator (should fail).
 * 5. Validates that the removal attempt throws a 400 Bad Request error.
 */
export async function test_api_community_owner_cannot_remove_self(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Add owner as moderator
  const moderator =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: owner.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 4. Attempt to remove owner as moderator (should fail)
  await TestValidator.error("owner cannot remove themselves", async () => {
    await api.functional.redditLike.member.communities.moderators.erase(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: owner.id,
      },
    );
  });
}