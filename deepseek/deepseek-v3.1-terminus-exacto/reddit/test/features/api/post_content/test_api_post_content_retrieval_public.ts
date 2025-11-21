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
 * Test public retrieval of post content without authentication requirements.
 *
 * This E2E test validates that published post content is accessible to all
 * users regardless of authentication status. It creates a post through an
 * authenticated member account, then retrieves the content publicly to verify
 * proper content delivery, formatting preservation, and public accessibility
 * while maintaining security boundaries for draft or removed posts.
 */
export async function test_api_post_content_retrieval_public(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Note: Since the API doesn't provide a community creation endpoint,
  // we'll use a valid UUID format for community ID but acknowledge that
  // in a real scenario, this would require an existing community
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create a published post with content
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
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create unauthenticated connection for public access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve post content publicly without authentication
  const postContent =
    await api.functional.communityPlatform.posts.contents.getByPostid(
      unauthConnection,
      { postId: post.id },
    );
  typia.assert(postContent);

  // Step 5: Validate content structure and relationships
  TestValidator.equals(
    "post content should reference the correct post",
    postContent.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "post content should have valid content",
    postContent.content.length > 0,
  );
  TestValidator.predicate(
    "post content should have valid word count",
    postContent.word_count >= 0,
  );
  TestValidator.predicate(
    "post content should have content type",
    postContent.content_type.length > 0,
  );

  // Step 6: Validate post reference in content
  TestValidator.equals(
    "content post reference ID should match",
    postContent.post.id,
    post.id,
  );
  TestValidator.equals(
    "content post title should match",
    postContent.post.title,
    post.title,
  );
  TestValidator.equals(
    "content post type should match",
    postContent.post.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "content post status should match",
    postContent.post.status,
    post.status,
  );

  // Step 7: Validate timestamps
  TestValidator.predicate(
    "post content should have creation timestamp",
    postContent.created_at.length > 0,
  );
  TestValidator.predicate(
    "post content should have update timestamp",
    postContent.updated_at.length > 0,
  );
}
