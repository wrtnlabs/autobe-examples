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

export async function test_api_comment_retrieval_soft_deleted_hidden_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Step 2: Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    { body: {} },
  );
  // Step 3: Subscribe to the community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    { communityId: community.id },
  );
  // Step 4: Create a post with text content in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(1),
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  // Step 5: Create a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: { postId: post.id },
      },
    );
  // Store original metadata for validation
  const originalAuthorId = comment.authorId;
  const originalVoteScore = comment.voteScore;
  const originalCreatedAt = comment.createdAt;
  // Step 6: Soft-delete the comment
  await api.functional.redditLike.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // Step 7: Retrieve the deleted comment
  const deletedComment = await api.functional.redditLike.posts.comments.at(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // Step 8: Validate soft-deleted comment with typia
  typia.assert(deletedComment);
  // Validate isDeleted flag is true
  TestValidator.predicate(
    "isDeleted flag is true",
    deletedComment.isDeleted === true,
  );
  // Validate content is hidden/empty (soft-deleted content should be hidden)
  TestValidator.predicate(
    "content is empty or marked as deleted",
    deletedComment.content === "" || deletedComment.content === "[deleted]",
  );
  // Validate metadata is preserved
  TestValidator.equals("id preserved", deletedComment.id, comment.id);
  TestValidator.equals(
    "authorId preserved",
    deletedComment.authorId,
    originalAuthorId,
  );
  TestValidator.equals("postId preserved", deletedComment.postId, post.id);
  TestValidator.equals(
    "voteScore preserved",
    deletedComment.voteScore,
    originalVoteScore,
  );
  // Validate author relation is populated
  TestValidator.predicate(
    "author is populated",
    deletedComment.author !== null,
  );
  TestValidator.equals(
    "author id matches",
    deletedComment.author.id,
    originalAuthorId,
  );
  // Validate post relation is populated
  TestValidator.predicate("post is populated", deletedComment.post !== null);
  TestValidator.equals(
    "post id in summary matches",
    deletedComment.post.id,
    post.id,
  );
  // Validate timestamps remain intact
  TestValidator.equals(
    "createdAt preserved",
    deletedComment.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt is valid",
    deletedComment.updatedAt !== null,
  );
  TestValidator.predicate(
    "updatedAt reflects deletion",
    deletedComment.updatedAt >= deletedComment.createdAt,
  );
  // Validate replies array exists (for thread continuity)
  TestValidator.predicate(
    "replies array exists",
    Array.isArray(deletedComment.replies),
  );
  // Validate edit flag is not affected by deletion
  TestValidator.equals(
    "isEdited flag",
    deletedComment.isEdited,
    comment.isEdited,
  );
}
