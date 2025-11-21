import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test public retrieval of published posts without authentication.
 *
 * This scenario validates that any user can access published posts regardless
 * of authentication status. The test involves creating a post as a member user
 * and then retrieving it without authentication to ensure public accessibility.
 * Validates that post content, metadata, and community information are properly
 * returned for public consumption.
 */
export async function test_api_post_retrieval_by_public_user(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authenticated operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a published post with realistic content
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    post_type: "text" as const,
    status: "published" as const,
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(createdPost);

  // Step 3: Create unauthenticated connection for public retrieval
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve the post without authentication
  const retrievedPost = await api.functional.communityPlatform.posts.at(
    unauthConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);

  // Step 5: Validate post content and metadata
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals(
    "post title matches",
    retrievedPost.title,
    postData.title,
  );
  TestValidator.equals(
    "post type matches",
    retrievedPost.post_type,
    postData.post_type,
  );
  TestValidator.equals(
    "post status is published",
    retrievedPost.status,
    "published",
  );
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community_platform_community_id,
    postData.community_platform_community_id,
  );

  // Step 6: Validate default engagement metrics
  TestValidator.equals("initial score is zero", retrievedPost.score, 0);
  TestValidator.equals(
    "initial view count is zero",
    retrievedPost.view_count,
    0,
  );
  TestValidator.equals(
    "initial comment count is zero",
    retrievedPost.comment_count,
    0,
  );

  // Step 7: Validate community information structure (using only properties that exist in ISummary)
  TestValidator.predicate(
    "community has ID",
    retrievedPost.community.id !== undefined,
  );
  TestValidator.predicate(
    "community has name",
    retrievedPost.community.name !== undefined,
  );
  TestValidator.predicate(
    "community has slug",
    retrievedPost.community.slug !== undefined,
  );
  TestValidator.predicate(
    "community has status",
    retrievedPost.community.status !== undefined,
  );
  TestValidator.predicate(
    "community has creation timestamp",
    retrievedPost.community.created_at !== undefined,
  );

  // Step 8: Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedPost.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is undefined for published post",
    retrievedPost.deleted_at === undefined,
  );

  // Step 9: Additional validation for community status (using actual enum values from DTO)
  const validStatuses = ["active", "archived", "suspended", "pending"] as const;
  TestValidator.predicate(
    "community status is valid",
    validStatuses.includes(retrievedPost.community.status),
  );
}
