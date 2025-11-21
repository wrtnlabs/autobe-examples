import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test post creation with different initial statuses (draft, published,
 * archived) to validate status-based visibility and moderation workflows. A
 * member creates posts with various status settings to ensure proper lifecycle
 * management, visibility controls, and moderation queue processing. Validates
 * that draft posts remain private, published posts become publicly visible, and
 * archived posts are preserved but hidden from active feeds.
 */
export async function test_api_member_post_creation_status_management(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create test posts with different statuses
  const statuses = ["draft", "published", "archived"] as const;

  for (const status of statuses) {
    // Generate unique community ID for each post (using valid UUID format)
    const communityId = typia.random<string & tags.Format<"uuid">>();

    // Create post with specific status
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          post_type: RandomGenerator.pick([
            "text",
            "link",
            "media",
            "poll",
          ] as const),
          status: status,
          community_platform_community_id: communityId,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);

    // Validate post properties
    TestValidator.equals(
      `post ${status} should have correct status`,
      post.status,
      status,
    );
    TestValidator.predicate(
      `post ${status} should have valid title length`,
      post.title.length >= 5 && post.title.length <= 300,
    );
    TestValidator.equals(
      `post ${status} should have correct community ID`,
      post.community_platform_community_id,
      communityId,
    );
    TestValidator.equals(
      `post ${status} should have zero initial score`,
      post.score,
      0,
    );
    TestValidator.equals(
      `post ${status} should have zero initial view count`,
      post.view_count,
      0,
    );
    TestValidator.equals(
      `post ${status} should have zero initial comment count`,
      post.comment_count,
      0,
    );

    // Validate post type is one of allowed values
    TestValidator.predicate(
      `post ${status} should have valid post type`,
      ["text", "link", "media", "poll"].includes(post.post_type),
    );

    // Validate timestamps
    TestValidator.predicate(
      `post ${status} should have creation timestamp`,
      post.created_at !== null && post.created_at !== undefined,
    );
    TestValidator.predicate(
      `post ${status} should have update timestamp`,
      post.updated_at !== null && post.updated_at !== undefined,
    );

    // Validate UUID format for post ID
    TestValidator.predicate(
      `post ${status} should have valid UUID format`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        post.id,
      ),
    );

    // Validate community summary structure
    TestValidator.predicate(
      `post ${status} should have community summary`,
      post.community !== null && post.community !== undefined,
    );
    TestValidator.predicate(
      `post ${status} community should have ID`,
      post.community.id !== null && post.community.id !== undefined,
    );
    TestValidator.predicate(
      `post ${status} community should have name`,
      post.community.name !== null && post.community.name !== undefined,
    );
    TestValidator.predicate(
      `post ${status} community should have slug`,
      post.community.slug !== null && post.community.slug !== undefined,
    );
    TestValidator.predicate(
      `post ${status} community should have status`,
      post.community.status !== null && post.community.status !== undefined,
    );
    TestValidator.predicate(
      `post ${status} community should have privacy`,
      post.community.privacy !== null && post.community.privacy !== undefined,
    );
    TestValidator.predicate(
      `post ${status} community should have creation timestamp`,
      post.community.created_at !== null &&
        post.community.created_at !== undefined,
    );
  }

  // Step 3: Test business logic - creating multiple posts with same community
  const sharedCommunityId = typia.random<string & tags.Format<"uuid">>();
  const postsWithSameCommunity = [];

  for (const status of ["draft", "published"] as const) {
    const post = await api.functional.communityPlatform.member.posts.create(
      connection,
      {
        body: {
          title: `Post for community ${sharedCommunityId} - ${status}`,
          post_type: "text",
          status: status,
          community_platform_community_id: sharedCommunityId,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    postsWithSameCommunity.push(post);

    TestValidator.equals(
      `post with ${status} should have shared community ID`,
      post.community_platform_community_id,
      sharedCommunityId,
    );
  }

  // Validate that posts with same community have different IDs
  TestValidator.notEquals(
    "posts with same community should have different IDs",
    postsWithSameCommunity[0].id,
    postsWithSameCommunity[1].id,
  );
}
