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
 * Test retrieving nested reply comments at various depth levels to validate
 * depth tracking and parent-child relationships.
 *
 * This test validates the comment threading system's ability to correctly track
 * and maintain nesting depth levels in multi-level discussion threads. The test
 * creates a complete comment hierarchy with three depth levels (0, 1, 2) and
 * verifies that each level has the correct depth value and parent references.
 *
 * Test workflow:
 *
 * 1. Create authenticated member account
 * 2. Create community to host discussion
 * 3. Create post to start comment thread
 * 4. Create top-level comment (depth 0)
 * 5. Create first nested reply (depth 1)
 * 6. Create second nested reply (depth 2)
 * 7. Retrieve and validate each comment's depth and parent references
 */
export async function test_api_comment_retrieval_nested_reply_depth_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to host the discussion
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post to start the comment thread
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create top-level comment (depth 0)
  const topLevelCommentText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();

  const topLevelComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: topLevelCommentText,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(topLevelComment);

  // Verify top-level comment has depth 0
  TestValidator.equals(
    "top-level comment depth is 0",
    topLevelComment.depth,
    0,
  );
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.reddit_like_parent_comment_id,
    undefined,
  );
  TestValidator.equals(
    "top-level comment belongs to post",
    topLevelComment.reddit_like_post_id,
    post.id,
  );

  // Step 5: Create first nested reply (depth 1)
  const firstReplyText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();

  const firstReply =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: topLevelComment.id,
      body: {
        content_text: firstReplyText,
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(firstReply);

  // Verify first reply has depth 1
  TestValidator.equals("first reply depth is 1", firstReply.depth, 1);
  TestValidator.equals(
    "first reply parent is top-level comment",
    firstReply.reddit_like_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "first reply belongs to post",
    firstReply.reddit_like_post_id,
    post.id,
  );

  // Step 6: Create second nested reply (depth 2)
  const secondReplyText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<10000>
  >();

  const secondReply =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: firstReply.id,
      body: {
        content_text: secondReplyText,
      } satisfies IRedditLikeComment.IReplyCreate,
    });
  typia.assert(secondReply);

  // Verify second reply has depth 2
  TestValidator.equals("second reply depth is 2", secondReply.depth, 2);
  TestValidator.equals(
    "second reply parent is first reply",
    secondReply.reddit_like_parent_comment_id,
    firstReply.id,
  );
  TestValidator.equals(
    "second reply belongs to post",
    secondReply.reddit_like_post_id,
    post.id,
  );

  // Step 7: Retrieve each comment and verify depth tracking
  const retrievedTopLevel = await api.functional.redditLike.comments.at(
    connection,
    {
      commentId: topLevelComment.id,
    },
  );
  typia.assert(retrievedTopLevel);
  TestValidator.equals(
    "retrieved top-level comment depth is 0",
    retrievedTopLevel.depth,
    0,
  );
  TestValidator.equals(
    "retrieved top-level comment has no parent",
    retrievedTopLevel.reddit_like_parent_comment_id,
    undefined,
  );

  const retrievedFirstReply = await api.functional.redditLike.comments.at(
    connection,
    {
      commentId: firstReply.id,
    },
  );
  typia.assert(retrievedFirstReply);
  TestValidator.equals(
    "retrieved first reply depth is 1",
    retrievedFirstReply.depth,
    1,
  );
  TestValidator.equals(
    "retrieved first reply parent is correct",
    retrievedFirstReply.reddit_like_parent_comment_id,
    topLevelComment.id,
  );

  const retrievedSecondReply = await api.functional.redditLike.comments.at(
    connection,
    {
      commentId: secondReply.id,
    },
  );
  typia.assert(retrievedSecondReply);
  TestValidator.equals(
    "retrieved second reply depth is 2",
    retrievedSecondReply.depth,
    2,
  );
  TestValidator.equals(
    "retrieved second reply parent is correct",
    retrievedSecondReply.reddit_like_parent_comment_id,
    firstReply.id,
  );

  // Validate depth increments correctly
  TestValidator.predicate(
    "depth increments by 1 from level 0 to 1",
    retrievedFirstReply.depth === retrievedTopLevel.depth + 1,
  );
  TestValidator.predicate(
    "depth increments by 1 from level 1 to 2",
    retrievedSecondReply.depth === retrievedFirstReply.depth + 1,
  );
}
