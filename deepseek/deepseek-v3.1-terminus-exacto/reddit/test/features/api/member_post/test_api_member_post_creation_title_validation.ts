import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate post creation title length constraints (5-300 characters)
 *
 * This test verifies that the community platform properly enforces title length
 * validation rules for post creation. It tests both successful scenarios with
 * valid title lengths and failure scenarios with titles outside the allowed
 * range. The test ensures that the API provides appropriate error messages for
 * boundary violations while allowing posts with titles at the minimum (5 chars)
 * and maximum (300 chars) limits.
 */
export async function test_api_member_post_creation_title_validation(
  connection: api.IConnection,
) {
  // Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Since we don't have a community creation API, we'll use a valid UUID format
  // but note that in a real scenario, the community should exist
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Create post with minimum title length (5 characters)
  const minTitlePost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: "Title", // Exactly 5 characters
        post_type: "text",
        status: "draft",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(minTitlePost);
  TestValidator.equals(
    "post with minimum title length should be created successfully",
    minTitlePost.title,
    "Title",
  );

  // Test 2: Create post with maximum title length (300 characters)
  const maxTitle = RandomGenerator.paragraph({
    sentences: 300,
    wordMin: 1,
    wordMax: 1,
  }); // Exactly 300 characters
  const maxTitlePost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: maxTitle,
        post_type: "text",
        status: "draft",
        community_platform_community_id: communityId,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(maxTitlePost);
  TestValidator.equals(
    "post with maximum title length should be created successfully",
    maxTitlePost.title,
    maxTitle,
  );

  // Test 3: Attempt to create post with title shorter than minimum (4 characters)
  await TestValidator.error(
    "post creation should fail with title shorter than 5 characters",
    async () => {
      return await api.functional.communityPlatform.member.posts.create(
        connection,
        {
          body: {
            title: "Four", // Only 4 characters
            post_type: "text",
            status: "draft",
            community_platform_community_id: communityId,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );

  // Test 4: Attempt to create post with title longer than maximum (301 characters)
  await TestValidator.error(
    "post creation should fail with title longer than 300 characters",
    async () => {
      return await api.functional.communityPlatform.member.posts.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 301,
              wordMin: 1,
              wordMax: 1,
            }), // 301 characters
            post_type: "text",
            status: "draft",
            community_platform_community_id: communityId,
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );

  // Test 5: Create post with various valid title lengths within range
  const validLengths = [10, 50, 100, 200, 299];
  for (const length of validLengths) {
    const validTitle = RandomGenerator.paragraph({
      sentences: length,
      wordMin: 1,
      wordMax: 1,
    });
    const validPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          title: validTitle,
          post_type: "text",
          status: "draft",
          community_platform_community_id: communityId,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(validPost);
    TestValidator.equals(
      `post with ${length} character title should be created successfully`,
      validPost.title,
      validTitle,
    );
  }

  // Test 6: Test different post types with valid titles
  const postTypes = ["text", "link", "media", "poll"] as const;
  for (const postType of postTypes) {
    const typedPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 20,
            wordMin: 3,
            wordMax: 8,
          }),
          post_type: postType,
          status: "draft",
          community_platform_community_id: communityId,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(typedPost);
    TestValidator.equals(
      `${postType} post type should be created successfully`,
      typedPost.post_type,
      postType,
    );
  }

  // Test 7: Test different status types with valid titles
  const statusTypes = ["draft", "published", "archived", "removed"] as const;
  for (const statusType of statusTypes) {
    const statusPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 15,
            wordMin: 4,
            wordMax: 10,
          }),
          post_type: "text",
          status: statusType,
          community_platform_community_id: communityId,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(statusPost);
    TestValidator.equals(
      `${statusType} status should be created successfully`,
      statusPost.status,
      statusType,
    );
  }
}
