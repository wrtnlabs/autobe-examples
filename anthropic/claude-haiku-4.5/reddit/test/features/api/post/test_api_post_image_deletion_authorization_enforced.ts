import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

/**
 * Test that authorization is properly enforced for image deletion.
 *
 * Verify that only the post creator can delete images from their posts.
 * Non-creator members attempting to delete images should receive authorization
 * errors. This test ensures proper access control is implemented for image
 * deletion operations.
 *
 * Test flow:
 *
 * 1. Create administrator account and platform infrastructure (category)
 * 2. Create two member accounts (creator and unauthorized user)
 * 3. Creator member creates a community
 * 4. Creator member creates a post with an attached image
 * 5. Unauthorized member attempts to delete the image (should fail with 403)
 * 6. Creator member successfully deletes their own image (should succeed)
 */
export async function test_api_post_image_deletion_authorization_enforced(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: "admin_" + RandomGenerator.alphaNumeric(8),
        name: "Administrator",
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin context for category creation
  connection.headers ??= {};
  connection.headers.Authorization = admin.token.access;

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology_" + RandomGenerator.alphaNumeric(8),
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (post creator)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        username: "creator_" + RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // Step 4: Create second member (unauthorized user)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        username: "other_" + RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberB);

  // Switch to member A context
  connection.headers.Authorization = memberA.token.access;

  // Step 5: Member A creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech_" + RandomGenerator.alphaNumeric(8),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Member A creates a post with an image
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "image",
        title: "My Amazing Post",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Add an image to the post
  const imageResponse: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: "https://example.com/image1.jpg",
          thumbnail_url: "https://example.com/image1-thumb.jpg",
          medium_url: "https://example.com/image1-medium.jpg",
          alt_text: "Test image",
          width_pixels: 800,
          height_pixels: 600,
          file_size_bytes: 102400,
          display_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(imageResponse);
  TestValidator.predicate(
    "post should contain at least one image",
    imageResponse.data.length > 0,
  );

  const imageId = imageResponse.data[0].id;

  // Step 8: Switch to member B context (unauthorized user)
  connection.headers.Authorization = memberB.token.access;

  // Step 9: Member B attempts to delete the image (should fail with authorization error)
  await TestValidator.error(
    "unauthorized member should not be able to delete image",
    async () => {
      await api.functional.communityPlatform.member.posts.images.erase(
        connection,
        {
          postId: post.id,
          imageId: imageId,
        },
      );
    },
  );

  // Step 10: Switch back to member A context (post creator)
  connection.headers.Authorization = memberA.token.access;

  // Step 11: Member A successfully deletes their own image
  await api.functional.communityPlatform.member.posts.images.erase(connection, {
    postId: post.id,
    imageId: imageId,
  });

  TestValidator.predicate("image deletion by creator should succeed", true);
}
