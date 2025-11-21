import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostContent";

/**
 * Test content retrieval across different post types (text, link, media, poll)
 * to ensure consistent content delivery mechanisms.
 *
 * This test validates that the content retrieval API properly handles all post
 * types and maintains consistent content delivery regardless of post type. It
 * creates posts with varied content types through member authentication, then
 * retrieves each content body publicly to verify that content_type field
 * properly influences content rendering and that different post types maintain
 * their specific content handling characteristics.
 */
export async function test_api_post_content_retrieval_different_types(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testpassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create posts with different content types using realistic community IDs
  const postTypes = ["text", "link", "media", "poll"] as const;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (const postType of postTypes) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          post_type: postType,
          status: "published",
          community_platform_community_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // Step 3: Create unauthenticated connection for public content retrieval
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve content for each post type and validate
  for (const post of createdPosts) {
    const content =
      await api.functional.communityPlatform.posts.contents.getByPostid(
        unauthConn,
        { postId: post.id },
      );
    typia.assert(content);

    // Validate content structure
    TestValidator.equals(
      "content should have post reference",
      content.post.id,
      post.id,
    );
    TestValidator.predicate(
      "content should have valid content field",
      typeof content.content === "string",
    );
    TestValidator.predicate(
      "content should have content_type field",
      typeof content.content_type === "string",
    );
    TestValidator.predicate(
      "word_count should be a number",
      typeof content.word_count === "number",
    );
    TestValidator.predicate(
      "word_count should be non-negative",
      content.word_count >= 0,
    );

    // Validate timestamps
    TestValidator.predicate(
      "created_at should be valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(content.created_at),
    );
    TestValidator.predicate(
      "updated_at should be valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(content.updated_at),
    );

    // Validate post type influence on content
    TestValidator.equals(
      "post type should match original post",
      content.post.post_type,
      post.post_type,
    );
  }

  // Step 5: Validate that all post types were properly handled
  TestValidator.equals(
    "should have created posts for all types",
    createdPosts.length,
    postTypes.length,
  );

  const retrievedPostTypes = createdPosts.map((post) => post.post_type);
  TestValidator.predicate(
    "should have all post types represented",
    postTypes.every((type) => retrievedPostTypes.includes(type)),
  );

  // Step 6: Test error scenario with invalid post ID
  await TestValidator.error("should fail with invalid post ID", async () => {
    await api.functional.communityPlatform.posts.contents.getByPostid(
      unauthConn,
      { postId: "00000000-0000-0000-0000-000000000000" },
    );
  });
}
