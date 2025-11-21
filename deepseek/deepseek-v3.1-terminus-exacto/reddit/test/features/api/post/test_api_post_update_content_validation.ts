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
 * Comprehensive validation of post update functionality including content
 * rules, title length constraints, status transitions, and error handling.
 *
 * This test validates that posts can be successfully updated with valid data
 * while properly rejecting invalid updates with appropriate error messages. It
 * covers the complete workflow from member authentication through post creation
 * and various update scenarios.
 */
export async function test_api_post_update_content_validation(
  connection: api.IConnection,
) {
  // 1. Member authentication - prerequisite for all operations
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

  // 2. Community creation - required for post association
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create initial post for testing updates
  const initialPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "draft",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(initialPost);

  // 4. Test successful post update with valid title (within 5-300 characters)
  const validUpdateTitle = RandomGenerator.paragraph({ sentences: 5 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: validUpdateTitle,
        status: "published",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);
  TestValidator.equals(
    "post title should be updated",
    updatedPost.title,
    validUpdateTitle,
  );
  TestValidator.equals(
    "post status should be published",
    updatedPost.status,
    "published",
  );

  // 5. Test minimum title length (5 characters)
  const minLengthTitle = RandomGenerator.alphabets(5);
  const minLengthUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: minLengthTitle,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(minLengthUpdate);
  TestValidator.equals(
    "minimum length title should be accepted",
    minLengthUpdate.title,
    minLengthTitle,
  );

  // 6. Test maximum title length (300 characters)
  const maxLengthTitle = RandomGenerator.alphabets(300);
  const maxLengthUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: maxLengthTitle,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(maxLengthUpdate);
  TestValidator.equals(
    "maximum length title should be accepted",
    maxLengthUpdate.title,
    maxLengthTitle,
  );

  // 7. Test post type change
  const typeChangeUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        post_type: "link",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(typeChangeUpdate);
  TestValidator.equals(
    "post type should be updated",
    typeChangeUpdate.post_type,
    "link",
  );

  // 8. Test status transitions
  const statusTransitions = ["archived", "removed", "draft"] as const;
  for (const status of statusTransitions) {
    const statusUpdate =
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: initialPost.id,
        body: {
          status: status,
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    typia.assert(statusUpdate);
    TestValidator.equals(
      `status should transition to ${status}`,
      statusUpdate.status,
      status,
    );
  }

  // 9. Test partial update (only title)
  const partialUpdateTitle = RandomGenerator.paragraph({ sentences: 4 });
  const partialUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: partialUpdateTitle,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(partialUpdate);
  TestValidator.equals(
    "partial title update should work",
    partialUpdate.title,
    partialUpdateTitle,
  );

  // 10. Test partial update (only status)
  const statusOnlyUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        status: "published",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(statusOnlyUpdate);
  TestValidator.equals(
    "status-only update should work",
    statusOnlyUpdate.status,
    "published",
  );

  // 11. Test error handling for invalid title length (4 characters - too short)
  await TestValidator.error(
    "title with 4 characters should fail validation",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: initialPost.id,
        body: {
          title: RandomGenerator.alphabets(4),
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 12. Test error handling for invalid title length (301 characters - too long)
  await TestValidator.error(
    "title with 301 characters should fail validation",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: initialPost.id,
        body: {
          title: RandomGenerator.alphabets(301),
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 13. Test error handling for invalid post type
  await TestValidator.error(
    "invalid post type should fail validation",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: initialPost.id,
        body: {
          post_type: "invalid_type" as "text",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 14. Test error handling for invalid status
  await TestValidator.error(
    "invalid status should fail validation",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: initialPost.id,
        body: {
          status: "invalid_status" as "draft",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 15. Verify community association remains unchanged after updates
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedPost.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "community summary should match",
    updatedPost.community.id,
    community.id,
  );
}
