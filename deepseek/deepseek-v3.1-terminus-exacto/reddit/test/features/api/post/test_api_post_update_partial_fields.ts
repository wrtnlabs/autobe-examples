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
 * Test partial post updates to validate that individual fields can be modified
 * independently. Update only the title while keeping other fields unchanged,
 * modify post type when community rules permit, and adjust status through
 * approved transitions. Verify that partial updates maintain data integrity and
 * that unchanged fields preserve their original values while updated fields
 * reflect the modifications.
 */
export async function test_api_post_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create community context
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create initial post for testing
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

  // Step 4: Test partial update - title only
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const titleOnlyUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: updatedTitle,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(titleOnlyUpdate);

  // Validate title was updated, other fields unchanged
  TestValidator.equals(
    "title should be updated",
    titleOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post_type should remain unchanged",
    titleOnlyUpdate.post_type,
    initialPost.post_type,
  );
  TestValidator.equals(
    "status should remain unchanged",
    titleOnlyUpdate.status,
    initialPost.status,
  );
  TestValidator.equals(
    "community ID should remain unchanged",
    titleOnlyUpdate.community_platform_community_id,
    initialPost.community_platform_community_id,
  );

  // Step 5: Test partial update - post type only
  const typeOnlyUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        post_type: "link",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(typeOnlyUpdate);

  // Validate post_type was updated, other fields unchanged
  TestValidator.equals(
    "post_type should be updated",
    typeOnlyUpdate.post_type,
    "link",
  );
  TestValidator.equals(
    "title should remain unchanged",
    typeOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "status should remain unchanged",
    typeOnlyUpdate.status,
    initialPost.status,
  );

  // Step 6: Test partial update - status only
  const statusOnlyUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        status: "published",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(statusOnlyUpdate);

  // Validate status was updated, other fields unchanged
  TestValidator.equals(
    "status should be updated",
    statusOnlyUpdate.status,
    "published",
  );
  TestValidator.equals(
    "title should remain unchanged",
    statusOnlyUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post_type should remain unchanged",
    statusOnlyUpdate.post_type,
    "link",
  );

  // Step 7: Test multiple field update
  const multipleUpdate =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: initialPost.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        status: "archived",
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(multipleUpdate);

  // Validate multiple fields were updated
  TestValidator.notEquals(
    "title should be different after update",
    multipleUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "status should be updated to archived",
    multipleUpdate.status,
    "archived",
  );
  TestValidator.equals(
    "post_type should remain unchanged",
    multipleUpdate.post_type,
    "link",
  );
}
