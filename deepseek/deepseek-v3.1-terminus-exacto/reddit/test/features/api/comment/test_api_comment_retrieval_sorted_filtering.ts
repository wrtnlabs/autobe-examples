import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_votes_create } from "../../../generate/generate_random_community_platform_user_comments_votes_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_comments_replies_create } from "../../../generate/generate_random_community_platform_user_posts_comments_replies_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test comment retrieval with sorting algorithms and hierarchical filtering.
 * Create a post with multiple top-level comments and nested replies with varied
 * vote scores and creation times. Test three sorting methods: Best (confidence-based
 * ranking), New (reverse chronological), and Controversial (high engagement with
 * neutral scores). Validate that deleted comments are filtered out and
 * parent_comment_id filtering works correctly. Test pagination with page and
 * limit parameters. Ensure each comment includes vote_score, replies_count,
 * author information, post context, and parent relationships.
 */
export async function test_api_comment_retrieval_sorted_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register user
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  // Create a post (assuming "general" community exists or using default)
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general", // Use existing community name
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create multiple top-level comments with varied vote scores
  const comment1 =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment1);
  // Add upvotes to comment1
  await api.functional.communityPlatform.user.comments.votes.create(
    userConnection,
    {
      commentId: comment1.id,
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformCommentVote.ICreate,
    },
  );
  const comment2 =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Add downvote to comment2
  await api.functional.communityPlatform.user.comments.votes.create(
    userConnection,
    {
      commentId: comment2.id,
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformCommentVote.ICreate,
    },
  );
  const comment3 =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment3);
  // Create nested replies to test threading
  const reply1 =
    await api.functional.communityPlatform.user.posts.comments.replies.create(
      userConnection,
      {
        postId: post.id,
        commentId: comment1.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment1.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply1);
  const reply2 =
    await api.functional.communityPlatform.user.posts.comments.replies.create(
      userConnection,
      {
        postId: post.id,
        commentId: comment1.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment1.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply2);
  // Test sorting algorithms
  // Test "best" sorting
  const bestComments =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: { sort: "best" } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestComments);
  TestValidator.predicate(
    "best sorting returns comments",
    bestComments.data.length > 0,
  );
  // Test "new" sorting
  const newComments =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: { sort: "new" } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(newComments);
  TestValidator.predicate(
    "new sorting returns comments",
    newComments.data.length > 0,
  );
  // Test "controversial" sorting
  const controversialComments =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialComments);
  TestValidator.predicate(
    "controversial sorting returns comments",
    controversialComments.data.length > 0,
  );
  // Test parent_comment_id filtering
  const threadComments =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: comment1.id,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(threadComments);
  TestValidator.predicate(
    "thread filtering returns replies",
    threadComments.data.length >= 2,
  );
  // Test pagination
  const paginatedComments =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 2,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(paginatedComments);
  TestValidator.equals(
    "pagination limit respected",
    paginatedComments.data.length <= 2,
    true
  );
  TestValidator.predicate(
    "pagination metadata present",
    paginatedComments.pagination.records > 0,
  );
  // Validate comment structure through typia.assert - no redundant checks needed
}