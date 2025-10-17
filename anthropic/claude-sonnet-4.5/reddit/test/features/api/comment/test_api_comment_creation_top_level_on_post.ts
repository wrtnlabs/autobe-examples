import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of creating a top-level comment on a post.
 *
 * This test validates that authenticated members can successfully post comments
 * directly on posts, initializing the comment with zero votes and proper
 * threading metadata. The workflow includes:
 *
 * 1. Register a new member account for authentication
 * 2. Create a community to host the post
 * 3. Create a post within that community
 * 4. Create a top-level comment on the post
 * 5. Validate comment properties including content, vote score, depth level, post
 *    association, and metadata
 */
export async function test_api_comment_creation_top_level_on_post(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community to host the post
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a top-level comment on the post
  const commentText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: commentText,
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Validate comment properties
  TestValidator.equals(
    "comment content matches input",
    comment.content_text,
    commentText,
  );
  TestValidator.equals(
    "comment vote score initialized to zero",
    comment.vote_score,
    0,
  );
  TestValidator.equals("comment depth is zero for top-level", comment.depth, 0);
  TestValidator.equals(
    "comment associated with correct post",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment has no parent comment",
    comment.reddit_like_parent_comment_id,
    undefined,
  );
  TestValidator.equals(
    "comment edited flag is false initially",
    comment.edited,
    false,
  );
  TestValidator.predicate(
    "comment has valid UUID",
    typia.is<string & tags.Format<"uuid">>(comment.id),
  );
  TestValidator.predicate(
    "comment has created timestamp",
    typia.is<string & tags.Format<"date-time">>(comment.created_at),
  );
  TestValidator.predicate(
    "comment has updated timestamp",
    typia.is<string & tags.Format<"date-time">>(comment.updated_at),
  );
}
