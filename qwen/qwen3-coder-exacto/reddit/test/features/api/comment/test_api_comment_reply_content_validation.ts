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
 * Test content validation for comment replies in a community forum.
 *
 * This test validates that the system properly enforces content rules for
 * comment replies, including maximum length limits (10,000 characters),
 * required content, and content moderation policies. The test attempts to
 * create replies with various invalid content (empty content, excessively long
 * content) and verifies that appropriate validation errors are returned. It
 * also confirms that valid content is properly stored and associated with the
 * correct parent comment and community.
 *
 * Test flow:
 *
 * 1. Create two users (one for creating content, one for replying)
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a comment on the post
 * 5. Test reply content validation with various inputs:
 *
 *    - Empty content (should fail validation)
 *    - Excessively long content over 10,000 characters (should fail validation)
 *    - Valid content should succeed
 */
export async function test_api_comment_reply_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create user for creating content
  const userBody = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userBody,
    });
  typia.assert(user);

  // Step 2: Create user for replying to comments
  const replierBody = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.name(1).replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const replier: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: replierBody,
    });
  typia.assert(replier);

  // Step 3: Create a community
  const communityBody = {
    name: RandomGenerator.name(2).replace(/\s+/g, "-"),
    slug: RandomGenerator.name(1).toLowerCase(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 4 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 4: Create a post in the community
  const postBody = {
    community_forum_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    type: "text",
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityForumCommunityPost.ICreate;

  const post: ICommunityForumCommunityPost =
    await api.functional.communityForum.user.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const comment: ICommunityForumPostComment =
    await api.functional.communityForum.user.posts.comments.create(connection, {
      postId: post.id,
      body: commentBody,
    });
  typia.assert(comment);

  // Test 1: Try to create a reply with empty content (should fail)
  await TestValidator.error("should reject empty reply content", async () => {
    const emptyReplyBody = {
      body: "",
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityForumPostComment.ICreate;

    await api.functional.communityForum.user.comments.replies.create(
      connection,
      {
        commentId: comment.id,
        body: emptyReplyBody,
      },
    );
  });

  // Test 2: Try to create a reply with content exceeding 10,000 characters (should fail)
  await TestValidator.error(
    "should reject reply content exceeding 10,000 characters",
    async () => {
      // Create a very long string exceeding 10,000 characters
      let longContent = "";
      while (longContent.length < 10001) {
        longContent += RandomGenerator.paragraph({ sentences: 10 });
      }

      const longReplyBody = {
        body: longContent,
        href: "http://localhost:3000/test",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityForumPostComment.ICreate;

      await api.functional.communityForum.user.comments.replies.create(
        connection,
        {
          commentId: comment.id,
          body: longReplyBody,
        },
      );
    },
  );

  // Test 3: Create a reply with valid content (should succeed)
  const validReplyBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    href: "http://localhost:3000/test",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumPostComment.ICreate;

  const reply: ICommunityForumPostComment =
    await api.functional.communityForum.user.comments.replies.create(
      connection,
      {
        commentId: comment.id,
        body: validReplyBody,
      },
    );
  typia.assert(reply);

  // Validate that the reply is properly associated
  TestValidator.equals(
    "reply should have correct parent comment ID",
    reply.parent_id,
    comment.id,
  );
  TestValidator.equals(
    "reply should have correct post ID",
    reply.community_forum_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply should have correct author ID",
    reply.community_forum_user_id,
    replier.id,
  );
  TestValidator.predicate(
    "reply body should match input",
    () => reply.body === validReplyBody.body,
  );
}
