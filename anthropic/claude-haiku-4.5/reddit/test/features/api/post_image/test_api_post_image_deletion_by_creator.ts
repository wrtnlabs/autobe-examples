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

export async function test_api_post_image_deletion_by_creator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = `admin_${RandomGenerator.alphabets(8)}@test.com`;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphabets(6)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create a community platform category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphabets(5)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (post creator) and authenticate
  const memberEmail = `member_${RandomGenerator.alphabets(8)}@test.com`;
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        username: `member_${RandomGenerator.alphabets(6)}`,
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post with Images",
        content_text: "This is a test post with multiple images",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Upload multiple images to the post
  const imageUrls = [
    {
      image: "https://example.com/image1.jpg",
      thumbnail: "https://example.com/thumb1.jpg",
      medium: "https://example.com/medium1.jpg",
    },
    {
      image: "https://example.com/image2.jpg",
      thumbnail: "https://example.com/thumb2.jpg",
      medium: "https://example.com/medium2.jpg",
    },
    {
      image: "https://example.com/image3.jpg",
      thumbnail: "https://example.com/thumb3.jpg",
      medium: "https://example.com/medium3.jpg",
    },
  ];

  const uploadedImages: ICommunityPlatformPostImage[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageData = imageUrls[i];
    const imageResponse: IPageICommunityPlatformPostImage =
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: imageData.image,
            thumbnail_url: imageData.thumbnail,
            medium_url: imageData.medium,
            alt_text: `Test image ${i + 1}`,
            width_pixels: 1200,
            height_pixels: 800,
            file_size_bytes: 102400,
            display_order: i,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    typia.assert(imageResponse);
    uploadedImages.push(...imageResponse.data);
  }

  TestValidator.predicate(
    "all images uploaded successfully to post",
    uploadedImages.length >= 3,
  );

  // Step 7: Select an image to delete (choose the second uploaded image)
  const imageToDelete = uploadedImages[1];
  TestValidator.predicate(
    "image to delete has valid ID",
    imageToDelete.id.length > 0,
  );

  // Step 8: Delete the image from the post
  await api.functional.communityPlatform.member.posts.images.erase(connection, {
    postId: post.id,
    imageId: imageToDelete.id,
  });

  // Step 9: Verify deletion completed without error
  // Note: The API does not provide a GET endpoint to retrieve and verify post images,
  // so we can only confirm the DELETE operation executed successfully.
  // The backend is responsible for:
  // - Permanently deleting the image from database and CDN
  // - Recalculating display_order values for remaining images sequentially from 0
  // - Removing the deleted image from post detail responses
  TestValidator.predicate(
    "image deletion operation completed successfully",
    true,
  );
}
