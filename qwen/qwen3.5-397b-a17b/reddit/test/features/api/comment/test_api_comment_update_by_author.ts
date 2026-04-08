import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment update functionality by the original author.
 *
 * Validates the complete comment update workflow including member authentication, community creation, subscription, post creation, comment creation, and comment update. Ensures that only the comment author can update their comment and that the system correctly manages timestamps and returns the full updated comment object.
 *
 * Special attention is given to verifying that the created_at timestamp remains unchanged while updated_at is refreshed, and that all comment metadata including author information, vote score, and replies array are correctly preserved and returned.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community using generate_random_reddit_community_member_communities_create.
 * 3. Member subscribes to their community using generate_random_reddit_community_member_member_subscriptions_create.
 * 4. Member creates a text post in the community using generate_random_reddit_community_posts_create.
 * 5. Member creates a comment on the post using generate_random_reddit_community_member_posts_comments_create.
 * 6. Member updates the comment with new content using api.functional.redditCommunity.member.posts.comments.update.
 * 7. Validates updated comment has new content, refreshed updated_at, unchanged created_at, and preserved metadata.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on post
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: originalContent,
        },
      },
    );
  typia.assert(comment);
  // Store original timestamps for validation
  const originalCreatedAt = comment.created_at;
  const originalUpdatedAt = comment.updated_at;
  // 6. Update comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 5 });
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 7. Validate update results
  TestValidator.equals("content updated", updatedComment.content, newContent);
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedComment.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "author preserved",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "author username preserved",
    updatedComment.author.username,
    comment.author.username,
  );
  TestValidator.predicate(
    "vote_score is number",
    typeof updatedComment.vote_score === "number",
  );
  TestValidator.predicate(
    "replies is array",
    Array.isArray(updatedComment.replies),
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedComment.deleted_at,
    null,
  );
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
}
