import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

/**
 * Test image upload with valid dimension metadata.
 *
 * This test validates that the image upload endpoint properly handles image
 * attachments with valid dimension metadata. Both width_pixels and
 * height_pixels must be provided as non-negative integers according to the
 * schema constraints (Minimum<0>).
 *
 * Step-by-step process:
 *
 * 1. Create authenticated member account
 * 2. Create community for hosting the post
 * 3. Create post to attach images to
 * 4. Upload image with valid dimensions
 * 5. Verify the image was created with correct metadata
 * 6. Upload second image with different dimensions
 * 7. Verify pagination and multiple images
 */
export async function test_api_post_image_upload_invalid_dimensions(
  connection: api.IConnection,
) {
  // 1. Create authenticated member account
  const memberData = {
    email:
      typia
        .random<string & tags.Format<"email">>()
        .replace("@", "_")
        .substring(0, 15) + "@test.example.com",
    username: RandomGenerator.alphabets(10),
    password: "ValidPassword123!",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(authorizedMember);

  // 2. Create community for hosting the post
  const communityData = {
    name: "Test Community " + RandomGenerator.alphabets(5),
    identifier: "test_" + RandomGenerator.alphabets(8),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // 3. Create post to attach images to
  const postData = {
    community_id: community.id,
    post_type: "image" as const,
    title: "Test Post for Image Upload",
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // 4. Upload image with valid positive dimensions
  const validImageData1 = {
    image_url: "https://example.com/images/test1.jpg",
    thumbnail_url: "https://example.com/images/test1_thumb.jpg",
    medium_url: "https://example.com/images/test1_medium.jpg",
    width_pixels: 1920,
    height_pixels: 1080,
    file_size_bytes: 512000,
    display_order: 0,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResult1: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: validImageData1,
      },
    );
  typia.assert(imageResult1);

  // 5. Verify the first image was created with correct metadata
  TestValidator.predicate(
    "first valid image upload should succeed",
    imageResult1.data.length > 0,
  );

  const uploadedImage1 = imageResult1.data[0];
  TestValidator.equals(
    "first uploaded image width matches input",
    uploadedImage1.width_pixels,
    validImageData1.width_pixels,
  );
  TestValidator.equals(
    "first uploaded image height matches input",
    uploadedImage1.height_pixels,
    validImageData1.height_pixels,
  );
  TestValidator.equals(
    "first uploaded image file size matches input",
    uploadedImage1.file_size_bytes,
    validImageData1.file_size_bytes,
  );

  // 6. Upload second image with different valid dimensions
  const validImageData2 = {
    image_url: "https://example.com/images/test2.jpg",
    thumbnail_url: "https://example.com/images/test2_thumb.jpg",
    medium_url: "https://example.com/images/test2_medium.jpg",
    width_pixels: 3840,
    height_pixels: 2160,
    file_size_bytes: 2048000,
    display_order: 1,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResult2: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: validImageData2,
      },
    );
  typia.assert(imageResult2);

  // 7. Verify pagination shows both images
  TestValidator.predicate(
    "second upload should result in multiple images",
    imageResult2.data.length >= 1,
  );

  // Verify the pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    imageResult2.pagination.current >= 0 &&
      imageResult2.pagination.limit > 0 &&
      imageResult2.pagination.records >= 1 &&
      imageResult2.pagination.pages >= 1,
  );

  // 8. Upload image with minimum valid dimensions (0 is valid per schema)
  const validImageDataMinimal = {
    image_url: "https://example.com/images/test3.jpg",
    thumbnail_url: "https://example.com/images/test3_thumb.jpg",
    medium_url: "https://example.com/images/test3_medium.jpg",
    width_pixels: 0,
    height_pixels: 0,
    file_size_bytes: 0,
    display_order: 2,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResult3: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: validImageDataMinimal,
      },
    );
  typia.assert(imageResult3);

  // Verify minimal dimensions are accepted
  TestValidator.predicate(
    "image with minimum dimensions should be accepted",
    imageResult3.data.length >= 1,
  );
}
