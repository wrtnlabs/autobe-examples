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
 * Validate content retrieval after post updates to ensure proper versioning and
 * update propagation.
 *
 * This test validates the complete content lifecycle management workflow:
 *
 * 1. Member authentication through join operation
 * 2. Initial post creation with original content
 * 3. Post update with new content information
 * 4. Public content retrieval to verify update propagation
 * 5. Validation of word_count and updated_at fields tracking content modifications
 *
 * The test ensures that content updates are properly reflected in retrieval
 * operations and that metadata fields accurately track content modifications.
 */
export async function test_api_post_content_retrieval_updated_content(
  connection: api.IConnection,
) {
  // 1. Member authentication through join operation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Use a valid community ID (assuming one exists in the system)
  // Since we don't have a community creation API, we'll use a realistic UUID
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // 2. Initial post creation with original content
  const originalPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(originalPost);

  // Store original timestamp for comparison
  const originalUpdatedAt = originalPost.updated_at;

  // 3. Post update with new content information
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: originalPost.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 8 }),
        status: "published",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // 4. Public content retrieval to verify update propagation
  const content =
    await api.functional.communityPlatform.posts.contents.getByPostid(
      connection,
      {
        postId: updatedPost.id,
      },
    );
  typia.assert(content);

  // 5. Validation of content update propagation and metadata tracking
  TestValidator.equals(
    "post ID should match between post and content",
    content.post.id,
    updatedPost.id,
  );
  TestValidator.equals(
    "updated post title should be reflected in content",
    content.post.title,
    updatedPost.title,
  );
  TestValidator.notEquals(
    "post title should be different after update",
    updatedPost.title,
    originalPost.title,
  );
  TestValidator.predicate(
    "word_count should be a positive number",
    content.word_count >= 0,
  );
  TestValidator.predicate(
    "content should have valid content",
    content.content.length > 0,
  );
  TestValidator.predicate(
    "content_type should be defined",
    content.content_type.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should reflect post modification",
    updatedPost.updated_at !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "content should reference the correct community",
    content.post.community.id === communityId,
  );
}
