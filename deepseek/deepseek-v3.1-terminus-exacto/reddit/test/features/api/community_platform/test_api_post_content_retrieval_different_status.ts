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
 * Test content retrieval across different post statuses (draft, published,
 * archived, removed) to validate proper access control and content visibility.
 *
 * This test creates posts with different statuses through member
 * authentication, then attempts content retrieval for each status. Validates
 * that content accessibility follows proper status-based rules and maintains
 * security boundaries for non-published content.
 */
export async function test_api_post_content_retrieval_different_status(
  connection: api.IConnection,
) {
  // Create authenticated member account
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

  // Use a valid UUID format for community ID (the API may validate community existence)
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Draft post content retrieval (should be accessible to authenticated member)
  const draftPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "draft",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(draftPost);

  // Retrieve draft post content (should succeed for authenticated member)
  const draftContent =
    await api.functional.communityPlatform.posts.contents.getByPostid(
      connection,
      {
        postId: draftPost.id,
      },
    );
  typia.assert(draftContent);
  TestValidator.equals(
    "draft post content should be retrieved",
    draftContent.community_platform_post_id,
    draftPost.id,
  );

  // Test 2: Published post content retrieval (should be publicly accessible)
  const publishedPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(publishedPost);

  // Retrieve published post content (should succeed)
  const publishedContent =
    await api.functional.communityPlatform.posts.contents.getByPostid(
      connection,
      {
        postId: publishedPost.id,
      },
    );
  typia.assert(publishedContent);
  TestValidator.equals(
    "published post content should be retrieved",
    publishedContent.community_platform_post_id,
    publishedPost.id,
  );

  // Test 3: Archived post content retrieval (should be read-only accessible)
  const archivedPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "archived",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(archivedPost);

  // Retrieve archived post content (should succeed for read-only access)
  const archivedContent =
    await api.functional.communityPlatform.posts.contents.getByPostid(
      connection,
      {
        postId: archivedPost.id,
      },
    );
  typia.assert(archivedContent);
  TestValidator.equals(
    "archived post content should be retrieved",
    archivedContent.community_platform_post_id,
    archivedPost.id,
  );

  // Test 4: Removed post content retrieval (should not be accessible)
  const removedPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "removed",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(removedPost);

  // Attempt to retrieve removed post content (should fail with proper error)
  await TestValidator.error(
    "removed post content should not be accessible",
    async () => {
      await api.functional.communityPlatform.posts.contents.getByPostid(
        connection,
        {
          postId: removedPost.id,
        },
      );
    },
  );

  // Validate that different status posts have different content access patterns
  TestValidator.notEquals(
    "draft and published posts should have different IDs",
    draftPost.id,
    publishedPost.id,
  );
  TestValidator.notEquals(
    "archived and removed posts should have different IDs",
    archivedPost.id,
    removedPost.id,
  );

  // Verify content structure for accessible posts
  TestValidator.predicate(
    "draft content should have valid structure",
    draftContent.content.length > 0,
  );
  TestValidator.predicate(
    "published content should have valid structure",
    publishedContent.content.length > 0,
  );
  TestValidator.predicate(
    "archived content should have valid structure",
    archivedContent.content.length > 0,
  );

  // Additional validation: Check that post content references are correct
  TestValidator.equals(
    "draft content post reference should match",
    draftContent.post.id,
    draftPost.id,
  );
  TestValidator.equals(
    "published content post reference should match",
    publishedContent.post.id,
    publishedPost.id,
  );
  TestValidator.equals(
    "archived content post reference should match",
    archivedContent.post.id,
    archivedPost.id,
  );
}
