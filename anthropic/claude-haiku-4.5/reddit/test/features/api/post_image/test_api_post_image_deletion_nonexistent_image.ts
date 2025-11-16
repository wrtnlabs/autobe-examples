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
 * Test error handling when attempting to delete an image that does not exist.
 *
 * Verifies that attempting to delete a non-existent image from a post returns a
 * 404 error and that no unintended deletions occur. The test creates the
 * necessary infrastructure (member, administrator, category, community, post,
 * and image) and then attempts to delete an image with an invalid ID. After
 * confirming the 404 error, the test successfully deletes the real image to
 * confirm it still exists and is accessible.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create and authenticate an administrator account
 * 3. Create a category for community classification
 * 4. Create a community by the member
 * 5. Create a post within the community
 * 6. Upload an image to the post
 * 7. Attempt to delete a non-existent image using a random UUID
 * 8. Verify 404 error is returned
 * 9. Successfully delete the real image to confirm it exists
 */
export async function test_api_post_image_deletion_nonexistent_image(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const memberHref: string = typia.random<string & tags.Format<"uri">>();
  const memberReferrer: string = typia.random<string & tags.Format<"uri">>();

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);
  typia.assert(memberAuth.token);

  // Step 2: Create and authenticate an administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminHref: string = typia.random<string & tags.Format<"uri">>();
  const adminReferrer: string = typia.random<string & tags.Format<"uri">>();

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 3: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create a community by the member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post within the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "image",
        title: RandomGenerator.name(3),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Upload an image to the post
  const imageUrl: string = typia.random<string & tags.Format<"uri">>();
  const thumbnailUrl: string = typia.random<string & tags.Format<"uri">>();
  const mediumUrl: string = typia.random<string & tags.Format<"uri">>();

  const uploadedImages: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: imageUrl,
          thumbnail_url: thumbnailUrl,
          medium_url: mediumUrl,
          width_pixels: 800,
          height_pixels: 600,
          file_size_bytes: 102400,
          display_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(uploadedImages);
  typia.assert(uploadedImages.data);
  TestValidator.predicate(
    "post should have at least one image after upload",
    uploadedImages.data.length > 0,
  );

  const actualImage: ICommunityPlatformPostImage = uploadedImages.data[0];
  typia.assert(actualImage);

  // Step 7-8: Attempt to delete a non-existent image using a random UUID
  const nonExistentImageId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.httpError(
    "deleting non-existent image should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.posts.images.erase(
        connection,
        {
          postId: post.id,
          imageId: nonExistentImageId,
        },
      );
    },
  );

  // Step 9: Verify the actual image still exists by successfully deleting it
  // If the image was accidentally deleted by the non-existent delete attempt,
  // this deletion would fail
  await api.functional.communityPlatform.member.posts.images.erase(connection, {
    postId: post.id,
    imageId: actualImage.id,
  });

  TestValidator.predicate(
    "real image should still exist and be deletable after failed non-existent delete",
    true,
  );
}
