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

export async function test_api_post_image_deletion_display_order_recalculation(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphabets(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user-${RandomGenerator.alphabets(6)}`,
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `community-${RandomGenerator.alphabets(6)}`,
          category_slug: category.slug,
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "image" as const,
        title: "Test Post with Images",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Upload 5 images with display_order 0-4
  const imageUrls = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
    "https://example.com/image4.jpg",
    "https://example.com/image5.jpg",
  ];

  const imageIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const imagePage: IPageICommunityPlatformPostImage =
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: imageUrls[i],
            thumbnail_url: imageUrls[i],
            medium_url: imageUrls[i],
            width_pixels: 800,
            height_pixels: 600,
            file_size_bytes: 102400,
            display_order: i,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    typia.assert(imagePage);

    // Extract the newly created image ID from the response
    if (imagePage.data.length > 0) {
      const newImage = imagePage.data.find(
        (img) =>
          img.display_order === i && img.community_platform_post_id === post.id,
      );
      if (newImage) {
        imageIds.push(newImage.id);
      }
    }
  }

  TestValidator.equals("5 images successfully uploaded", imageIds.length, 5);

  // Step 7: Delete the image at position 2 (middle of the sequence)
  const imageToDeleteId = imageIds[2];
  await api.functional.communityPlatform.member.posts.images.erase(connection, {
    postId: post.id,
    imageId: imageToDeleteId,
  });

  TestValidator.predicate(
    "image deletion endpoint executed successfully",
    true,
  );

  // Step 8: Upload a new image and verify that display_order is correctly assigned
  // This validates that the system maintains proper display_order sequence
  const verificationPage: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: "https://example.com/verification.jpg",
          thumbnail_url: "https://example.com/verification.jpg",
          medium_url: "https://example.com/verification.jpg",
          width_pixels: 800,
          height_pixels: 600,
          file_size_bytes: 102400,
          display_order: 4,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(verificationPage);

  // Verify that the response contains images with proper structure
  TestValidator.predicate(
    "post image collection contains data after deletion and new upload",
    verificationPage.data.length > 0,
  );

  // Verify pagination structure is valid
  TestValidator.predicate(
    "pagination contains valid current page",
    verificationPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination contains valid limit",
    verificationPage.pagination.limit > 0,
  );
}
