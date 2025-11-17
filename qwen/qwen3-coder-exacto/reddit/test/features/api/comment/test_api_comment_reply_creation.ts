import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";

/**
 * Test creating a reply to a comment in a community forum.
 *
 * This test validates the complete workflow for creating a reply to an existing
 * comment:
 *
 * 1. Register a new user who will create the reply
 * 2. Create a community to host the discussion
 * 3. Create a post within that community
 * 4. Create an initial comment on that post
 * 5. Create a reply to that comment
 * 6. Verify that the reply was created successfully with correct parent-child
 *    relationship
 *
 * The test ensures that:
 *
 * - Replies can be created by authenticated users
 * - The parent-child relationship between comments is properly maintained
 * - All required fields are correctly populated
 * - The response matches the expected structure
 */
export async function test_api_comment_reply_creation(
  connection: api.IConnection,
) {
  // 1. Register a new user who will create the reply
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.alphabets(10), // Generate valid username (alphanumeric, 3-21 chars)
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 2. Create a community
  const communityName = RandomGenerator.alphabets(10);
  const communityBody = {
    name: communityName,
    slug: communityName.toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 4 }),
    privacy_level: RandomGenerator.pick(["public", "private", "restricted"]),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a post in the community
  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    type: "text",
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Create an initial comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    href: `https://example.com/post/${post.id}`,
    referrer: "https://example.com/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentBody,
    });
  typia.assert(comment);

  // 5. Create a reply to the comment
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    href: `https://example.com/post/${post.id}#comment-${comment.id}`,
    referrer: `https://example.com/post/${post.id}`,
  } satisfies ICommunityForumPostComment.ICreate;

  const reply: ICommunityForumPostComment =
    await api.functional.communityForum.user.comments.replies.create(
      connection,
      {
        commentId: comment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  // 6. Validate the reply was created correctly
  TestValidator.equals(
    "reply parent ID should match original comment ID",
    reply.parent_id,
    comment.id,
  );
  TestValidator.equals(
    "reply post ID should match original post ID",
    reply.community_forum_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply author ID should match user ID",
    reply.community_forum_user_id,
    user.id,
  );
  TestValidator.predicate(
    "reply body should match requested body",
    reply.body === replyBody.body,
  );
  TestValidator.predicate(
    "reply should not be deleted",
    reply.deleted_at === null || reply.deleted_at === undefined,
  );
  TestValidator.predicate(
    "reply should have creation timestamp",
    reply.created_at !== undefined,
  );
}
