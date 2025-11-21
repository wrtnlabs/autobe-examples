import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test comment retrieval with threaded discussion context to validate
 * parent-child relationship handling.
 *
 * This test creates a complete comment thread hierarchy with nested replies and
 * verifies that the retrieval operation correctly includes parent comment
 * information when applicable. The test ensures threaded comments maintain
 * proper context and relationship information for effective discussion
 * navigation.
 */
export async function test_api_post_comment_retrieval_with_thread_context(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post for the comment thread
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create parent comment (root of the thread)
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // Step 4: Create child comment with parent reference
  const childComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 5,
        }),
        parent_id: parentComment.id,
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(childComment);

  // Step 5: Retrieve child comment and validate parent relationship
  const retrievedChildComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: childComment.id,
    });
  typia.assert(retrievedChildComment);

  // Validate that parent information is correctly included
  TestValidator.equals(
    "child comment should have parent reference",
    retrievedChildComment.parent?.id,
    parentComment.id,
  );

  // Validate parent comment summary structure
  TestValidator.equals(
    "parent comment summary should match created parent",
    retrievedChildComment.parent?.body,
    parentComment.body,
  );

  // Step 6: Retrieve parent comment and validate it has no parent (root level)
  const retrievedParentComment =
    await api.functional.communityPlatform.posts.comments.at(connection, {
      postId: post.id,
      commentId: parentComment.id,
    });
  typia.assert(retrievedParentComment);

  // Parent comment should not have a parent reference (it's the root)
  TestValidator.equals(
    "parent comment should not have parent reference",
    retrievedParentComment.parent,
    undefined,
  );

  // Validate post association for both comments
  TestValidator.equals(
    "child comment should be associated with correct post",
    retrievedChildComment.community_platform_post_id,
    post.id,
  );

  TestValidator.equals(
    "parent comment should be associated with correct post",
    retrievedParentComment.community_platform_post_id,
    post.id,
  );

  // Validate comment content integrity
  TestValidator.equals(
    "child comment body should match original",
    retrievedChildComment.body,
    childComment.body,
  );

  TestValidator.equals(
    "parent comment body should match original",
    retrievedParentComment.body,
    parentComment.body,
  );

  // Additional validation: Test reply count functionality
  TestValidator.predicate(
    "parent comment should have reply count incremented",
    retrievedParentComment.reply_count >= 1,
  );
}
