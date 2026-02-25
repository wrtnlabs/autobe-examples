import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test user changing their vote from upvote to downvote on a comment.
 *
 * Workflow:
 * 1. User joins the platform
 * 2. User creates a post
 * 3. User creates a comment on the post
 * 4. User upvotes the comment
 * 5. User changes vote from upvote to downvote
 * 6. Validate vote type change and vote details
 */
export async function test_api_comment_vote_update_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. User joins the platform
  const user = await authorize_user_join(userConnection, {
    body: {
      email: "testuser@example.com",
      password: "password123",
      username: "testuser",
    },
  });
  // 2. User creates a post (using text post type for simplicity)
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: "Test Post for Comment Voting",
        community_name: "general",
        post_type: "text",
        text_content:
          "This is a test post content for comment voting functionality.",
      },
    },
  );
  // 3. User creates a comment on the post
  const comment =
    await api.functional.communityPlatform.user.posts.comments.create(
      userConnection,
      {
        postId: post.id,
        body: {
          content: "This is a test comment for voting.",
        },
      },
    );
  // 4. User upvotes the comment
  const upvote =
    await api.functional.communityPlatform.user.comments.votes.create(
      userConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        },
      },
    );
  // 5. User changes vote from upvote to downvote
  const updatedVote =
    await api.functional.communityPlatform.user.comments.votes.putByCommentidAndVoteid(
      userConnection,
      {
        commentId: comment.id,
        voteId: upvote.id,
        body: {
          vote_type: "downvote",
        },
      },
    );
  // 6. Validate vote type changed correctly
  if (updatedVote.vote_type !== "downvote") {
    throw new Error(
      `Expected vote type 'downvote' but got '${updatedVote.vote_type}'`,
    );
  }
  // Validate vote ID remains the same
  if (updatedVote.id !== upvote.id) {
    throw new Error("Vote ID should remain the same after update");
  }
  // Validate user information is consistent
  if (updatedVote.user.id !== user.id) {
    throw new Error("Vote should belong to the same user");
  }
  // Validate comment information is consistent
  if (updatedVote.comment.id !== comment.id) {
    throw new Error("Vote should be associated with the same comment");
  }
}
