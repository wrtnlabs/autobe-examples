import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that a post author can successfully update their text post's title and body content.
 *
 * Validates the complete post update workflow including member authentication, community setup, subscription, text post creation, and post update operations. Ensures that only the post author can update their post and that both title and body fields are correctly modified while preserving other metadata.
 *
 * Special attention is given to verifying that the updated_at timestamp reflects the modification time, the post_type remains 'text', and engagement metrics (voteScore, commentsCount) remain unchanged after the update operation.
 *
 * 1. Member authenticates via join operation to obtain authorization token.
 * 2. Member creates a community they own for posting content.
 * 3. Member subscribes to their own community to enable posting privileges.
 * 4. Member creates a text post with initial title and body content in the community.
 * 5. Member updates the post by modifying both title and body fields.
 * 6. Validates the updated post contains the new title and body content.
 * 7. Validates the updated_at timestamp is newer than created_at.
 * 8. Validates post_type remains 'text' and metadata (voteScore, commentsCount) is unchanged.
 */
export async function test_api_post_update_by_author_text_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 4. Create text post with initial content
  const initialTitle = RandomGenerator.paragraph({ sentences: 1 });
  const initialBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        post_type: "text",
        community_id: community.id,
        body: initialBody,
      },
    },
  );
  typia.assert(post);
  // Verify initial post state
  TestValidator.equals("post type is text", post.postType, "text");
  TestValidator.equals("initial title matches", post.title, initialTitle);
  TestValidator.predicate("content is text type", () => {
    if (post.content && post.postType === "text") {
      return "body" in post.content;
    }
    return false;
  });
  // 5. Update post with new title and body
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost = await api.functional.redditCommunity.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Verify updated content
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.predicate("body updated", () => {
    if (updatedPost.content && updatedPost.postType === "text") {
      const textContent = updatedPost.content as IRedditCommunityPostTextContent;
      return textContent.body === updatedBody;
    }
    return false;
  });
  // 7. Verify timestamps
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedPost.updatedAt) > new Date(updatedPost.createdAt),
  );
  TestValidator.predicate(
    "updated_at changed after update",
    new Date(updatedPost.updatedAt) > new Date(post.updatedAt),
  );
  // 8. Verify metadata unchanged
  TestValidator.equals("post type unchanged", updatedPost.postType, "text");
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    post.community.id,
  );
  TestValidator.equals(
    "voteScore unchanged",
    updatedPost.voteScore,
    post.voteScore,
  );
  TestValidator.equals(
    "commentsCount unchanged",
    updatedPost.commentsCount,
    post.commentsCount,
  );
}