import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful post update workflow by the original author.
 *
 * This E2E test validates that authenticated members can modify their own posts
 * by updating title content, changing post type when allowed by community
 * rules, and adjusting post status through valid transitions. The test follows
 * a complete workflow: member registration, community creation, initial post
 * creation, and post update operations.
 *
 * Key validations include:
 *
 * - Core post attributes preservation during updates
 * - Proper timestamp updates for modification tracking
 * - Community association immutability after creation
 * - Valid status transitions according to business rules
 * - Author permission verification for update operations
 */
export async function test_api_post_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community for post hosting
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create initial post for update testing
  const initialPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
        post_type: "text",
        status: "draft",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(initialPost);

  // Step 4: Update the post with modified content
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 12,
        }),
        post_type: "link",
        status: "published",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 5: Validate post update results
  TestValidator.equals(
    "post ID remains unchanged",
    updatedPost.id,
    initialPost.id,
  );
  TestValidator.notEquals(
    "title should be updated",
    updatedPost.title,
    initialPost.title,
  );
  TestValidator.notEquals(
    "post type should be updated",
    updatedPost.post_type,
    initialPost.post_type,
  );
  TestValidator.notEquals(
    "status should be updated",
    updatedPost.status,
    initialPost.status,
  );
  TestValidator.equals(
    "community association remains unchanged",
    updatedPost.community.id,
    initialPost.community.id,
  );
  TestValidator.predicate(
    "updated_at timestamp should be newer",
    new Date(updatedPost.updated_at) > new Date(initialPost.updated_at),
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedPost.created_at,
    initialPost.created_at,
  );
}
