import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the primary success path of a member updating their own comment content.
 *
 * This test creates a complete workflow:
 * 1. Authenticate member using GET /redditLike/auth/member/join
 * 2. Create a new community
 * 3. Subscribe to the created community
 * 4. Create a post in the subscribed community
 * 5. Create a comment on the post
 * 6. Update the comment with new content
 *
 * Validates that the updated comment reflects the new content, is_edited flag is set to true,
 * timestamps are updated, author and post relationships remain intact, and thread structure is preserved.
 */
export async function test_api_comment_update_own_comment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // 2. Create a community using the authenticated member
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to the created community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create a new post in the subscribed community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const originalContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: originalContent,
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Record original timestamp for comparison
  const originalUpdatedAt = comment.updatedAt;
  // 6. Update the comment with new content
  const updatedContent =
    RandomGenerator.content({ paragraphs: 1, sentenceMin: 3, sentenceMax: 6 }) +
    " [Updated]";
  const updateBody = {
    content: updatedContent,
  } satisfies IRedditLikeComment.IUpdate;
  const updatedComment =
    await api.functional.redditLike.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedComment);
  // Validation points
  TestValidator.equals(
    "comment content matches new content",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals(
    "is_edited flag is true after update",
    updatedComment.isEdited,
    true,
  );
  TestValidator.equals(
    "author_id matches authenticated member",
    updatedComment.authorId,
    member.id,
  );
  TestValidator.equals(
    "post_id matches the path parameter",
    updatedComment.postId,
    post.id,
  );
  TestValidator.equals(
    "comment belongs to the post",
    updatedComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "post title matches original",
    updatedComment.post.title,
    post.title,
  );
  TestValidator.equals(
    "post community matches",
    updatedComment.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "author username matches original member",
    updatedComment.author.username,
    member.username,
  );
  TestValidator.equals(
    "thread structure preserved - parent is null for top-level",
    updatedComment.parentId,
    null,
  );
  TestValidator.equals(
    "thread structure preserved - parent object is null",
    updatedComment.parent,
    null,
  );
  TestValidator.equals(
    "replies array preserved",
    Array.isArray(updatedComment.replies),
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp reflects modification",
    originalUpdatedAt,
    updatedComment.updatedAt,
  );
  TestValidator.equals(
    "comment.id unchanged after update",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment.createdAt unchanged after update",
    updatedComment.createdAt,
    comment.createdAt,
  );
  TestValidator.equals(
    "isDeleted remains false after update",
    updatedComment.isDeleted,
    false,
  );
  TestValidator.equals(
    "voteScore preserved after update",
    updatedComment.voteScore,
    comment.voteScore,
  );
}
