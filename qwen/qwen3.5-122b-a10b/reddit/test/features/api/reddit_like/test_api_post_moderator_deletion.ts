import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test community moderator post deletion capability.
 *
 * Validates that a community moderator can delete any post within their community, regardless of post authorship. This test verifies the moderation permission model where moderators have authority to remove content that violates community standards.
 *
 * The test workflow establishes two member accounts: one who creates and owns a community (becoming the moderator), and another who creates a post in that community. The moderator then successfully deletes the other member's post, confirming that moderation privileges extend beyond post ownership.
 *
 * 1. Create first member account who will become the community moderator.
 * 2. Create a new community with the first member as owner.
 * 3. Subscribe the first member to their own community.
 * 4. Create second member account who will create a post.
 * 5. Subscribe the second member to the community to enable posting.
 * 6. Create a text post by the second member in the community.
 * 7. Add the first member as a moderator to the community.
 * 8. Delete the post using the moderator's authenticated session.
 * 9. Validate successful deletion through operation completion.
 */
export async function test_api_post_moderator_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 2. Create community (moderator becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe moderator to their own community
  await generate_random_reddit_like_member_subscriptions_create(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 4. Create second member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(author);
  // 5. Subscribe author to the community
  await generate_random_reddit_like_member_subscriptions_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 6. Create post by author
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 7. Add moderator to the community (they're already owner, but this confirms moderator status)
  await generate_random_reddit_like_member_communities_moderators_create(
    moderatorConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: moderator.id,
      },
    },
  );
  // 8. Delete the post using moderator's session
  await api.functional.redditLike.member.posts.erase(moderatorConnection, {
    postId: post.id,
  });
  // 9. Deletion successful - no error thrown confirms moderator can delete others' posts
}
