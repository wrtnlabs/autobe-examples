import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test member can update their own text post's title and content.
 *
 * Validates the post update workflow where an authenticated member modifies their own text post. The test ensures that the update operation correctly modifies the title and content_text fields while preserving other post metadata such as vote_score and comments_count.
 *
 * The scenario follows the complete post lifecycle: member registration, community creation, subscription, post creation, and post update. All business rules are validated including ownership verification and content field constraints.
 *
 * 1. Member account is created via join endpoint with valid credentials.
 * 2. A new community is created by the member.
 * 3. Member subscribes to the created community.
 * 4. A text post is created with initial title and content_text.
 * 5. The post is updated with new title and content_text values.
 * 6. Updated post is validated to confirm title and content changes.
 * 7. updated_at timestamp is verified to have changed from original.
 * 8. vote_score and comments_count are verified to remain unchanged.
 */
export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create initial text post
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalContent = RandomGenerator.paragraph({ sentences: 10 });
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: originalTitle,
        content_type: "text",
        content_text: originalContent,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Store original updated_at for comparison
  const originalUpdatedAt = post.updated_at;
  // 5. Update the post with new title and content
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newContent = RandomGenerator.paragraph({ sentences: 15 });
  const updatedPost = await api.functional.redditLike.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        content_text: newContent,
      } satisfies IRedditLikePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Verify updated post has modified title and content
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals(
    "content_text updated",
    updatedPost.content_text,
    newContent,
  );
  // 7. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedPost.updated_at,
    originalUpdatedAt,
  );
  // 8. Verify vote_score and comments_count remain unchanged
  TestValidator.equals(
    "vote_score unchanged",
    updatedPost.vote_score,
    post.vote_score,
  );
  TestValidator.equals(
    "comments_count unchanged",
    updatedPost.comments_count,
    post.comments_count,
  );
}
