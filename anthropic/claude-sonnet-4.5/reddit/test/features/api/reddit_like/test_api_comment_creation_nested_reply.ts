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
 * Test nested comment reply creation in threaded discussions.
 *
 * This test validates the complete workflow of creating a nested reply comment
 * responding to an existing comment. It verifies the threaded discussion system
 * where members can reply to other comments, creating nested conversation
 * trees.
 *
 * Steps:
 *
 * 1. Register and authenticate as a member
 * 2. Create a community to host discussions
 * 3. Create a post within the community
 * 4. Create an initial top-level comment
 * 5. Create a nested reply to that comment
 * 6. Validate parent_comment_id references the original comment
 * 7. Verify depth level calculation (parent depth + 1)
 * 8. Confirm threading relationship is maintained
 */
export async function test_api_comment_creation_nested_reply(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a community to host the post and comments
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Create a post to hold the comments
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Create an initial top-level comment
  const topLevelCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeComment.ICreate;

  const topLevelComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: topLevelCommentData,
    });
  typia.assert(topLevelComment);

  // Verify top-level comment has depth 0 and no parent
  TestValidator.equals(
    "top-level comment depth should be 0",
    topLevelComment.depth,
    0,
  );
  TestValidator.equals(
    "top-level comment should have no parent",
    topLevelComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 5: Create a nested reply to the top-level comment
  const nestedReplyData = {
    reddit_like_post_id: post.id,
    reddit_like_parent_comment_id: topLevelComment.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const nestedReply =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: post.id,
      body: nestedReplyData,
    });
  typia.assert(nestedReply);

  // Step 6: Validate the reply has correct parent_comment_id
  TestValidator.equals(
    "nested reply should reference parent comment",
    nestedReply.reddit_like_parent_comment_id,
    topLevelComment.id,
  );

  // Step 7: Verify depth level is calculated correctly (parent depth + 1)
  TestValidator.equals(
    "nested reply depth should be parent depth + 1",
    nestedReply.depth,
    topLevelComment.depth + 1,
  );
  TestValidator.equals("nested reply depth should be 1", nestedReply.depth, 1);

  // Step 8: Verify both comments belong to the same post
  TestValidator.equals(
    "both comments should belong to the same post",
    nestedReply.reddit_like_post_id,
    topLevelComment.reddit_like_post_id,
  );
  TestValidator.equals(
    "nested reply should belong to created post",
    nestedReply.reddit_like_post_id,
    post.id,
  );

  // Additional validation: Verify comment IDs are unique
  TestValidator.predicate(
    "top-level comment and nested reply should have different IDs",
    topLevelComment.id !== nestedReply.id,
  );

  // Verify both comments have valid timestamps
  TestValidator.predicate(
    "top-level comment should have valid creation timestamp",
    new Date(topLevelComment.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "nested reply should have valid creation timestamp",
    new Date(nestedReply.created_at).getTime() > 0,
  );

  // Verify nested reply was created after or at the same time as parent
  TestValidator.predicate(
    "nested reply should be created after or at same time as parent",
    new Date(nestedReply.created_at).getTime() >=
      new Date(topLevelComment.created_at).getTime(),
  );
}
