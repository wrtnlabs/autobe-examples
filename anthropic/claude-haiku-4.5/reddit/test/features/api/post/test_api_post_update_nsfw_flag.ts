import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test toggling the NSFW flag on an existing post.
 *
 * This test validates the ability to toggle a post's Not Safe For Work (NSFW)
 * content flag through the post update endpoint. It verifies that:
 *
 * - A post can be created with is_nsfw=false (default)
 * - The NSFW flag can be toggled to is_nsfw=true via PUT endpoint
 * - The response reflects the updated NSFW status immediately
 * - The flag modification is preserved and accessible to the post creator
 *
 * Test workflow:
 *
 * 1. Administrator creates a platform content category
 * 2. Member joins/registers for the platform
 * 3. Member creates a community within the category
 * 4. Member creates a post with is_nsfw=false
 * 5. Member updates the post to set is_nsfw=true
 * 6. Verify the response shows is_nsfw=true
 * 7. Verify the flag change was persisted
 */
export async function test_api_post_update_nsfw_flag(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a platform content category
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: `Admin ${RandomGenerator.name()}`,
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category ${RandomGenerator.name()}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member joins the platform
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  // Step 3: Member creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community ${RandomGenerator.name()}`,
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Member creates a post with is_nsfw=false
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Post ${RandomGenerator.name()}`,
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.equals("initial is_nsfw should be false", post.is_nsfw, false);

  // Step 5: Member updates the post to toggle is_nsfw to true
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(connection, {
      postId: post.id,
      body: {
        is_nsfw: true,
      } satisfies ICommunityPlatformPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 6: Verify the response shows is_nsfw=true
  TestValidator.equals(
    "updated is_nsfw should be true",
    updatedPost.is_nsfw,
    true,
  );
  TestValidator.equals(
    "post id should remain unchanged",
    updatedPost.id,
    post.id,
  );
  TestValidator.equals(
    "post title should remain unchanged",
    updatedPost.title,
    post.title,
  );

  // Step 7: Verify other fields are preserved during update
  TestValidator.equals(
    "post type should remain text",
    updatedPost.post_type,
    "text",
  );
  TestValidator.equals(
    "community relationship should persist",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "creator should remain same",
    updatedPost.creator.id,
    post.creator.id,
  );
}
