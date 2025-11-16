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
 * Test uploading multiple images to a single post with display ordering.
 *
 * This test validates the complete image gallery functionality:
 *
 * 1. Member registration for authenticated access
 * 2. Community creation as a container for posts
 * 3. Post creation in the community
 * 4. Multiple image uploads with sequential display_order values
 * 5. Verification of all images attached to the post
 * 6. Validation of unique and ordered display_order values
 *
 * The test ensures that posts can contain multiple images displayed in a
 * controlled sequence, and that the API preserves the display ordering while
 * maintaining referential integrity.
 */
export async function test_api_post_image_upload_multiple_images(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // 2. Create community for hosting the post
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    identifier: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 3. Create post in the community
  const postData = {
    community_id: community.id,
    post_type: "image" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // 4. Upload multiple images with display_order values
  const imageCount = 4;
  let lastImageResponse: IPageICommunityPlatformPostImage | null = null;

  for (let i = 0; i < imageCount; i++) {
    const imageData = {
      image_url: typia.random<string & tags.Format<"uri">>(),
      thumbnail_url: typia.random<string & tags.Format<"uri">>(),
      medium_url: typia.random<string & tags.Format<"uri">>(),
      alt_text: RandomGenerator.paragraph({ sentences: 2 }),
      width_pixels: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<2000>
      >(),
      height_pixels: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<2000>
      >(),
      file_size_bytes: typia.random<
        number &
          tags.Type<"uint32"> &
          tags.Minimum<1000> &
          tags.Maximum<5000000>
      >(),
      display_order: i,
    } satisfies ICommunityPlatformPostImage.ICreate;

    lastImageResponse =
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: imageData,
        },
      );
    typia.assert(lastImageResponse);
  }

  // 5. Verify response contains all images
  TestValidator.predicate(
    "image response contains data",
    lastImageResponse !== null &&
      lastImageResponse.data !== null &&
      lastImageResponse.data.length > 0,
  );

  // 6. Verify pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    lastImageResponse !== null &&
      lastImageResponse.pagination !== null &&
      lastImageResponse.pagination.current >= 0 &&
      lastImageResponse.pagination.limit > 0,
  );

  // 7. Extract all images from response
  const allImages = lastImageResponse!.data;
  TestValidator.predicate(
    "response contains all uploaded images",
    allImages.length >= imageCount,
  );

  // 8. Verify each image belongs to the correct post
  for (const image of allImages) {
    TestValidator.equals(
      "image belongs to correct post",
      image.community_platform_post_id,
      post.id,
    );
  }

  // 9. Verify display_order values are unique and sequential
  const displayOrders = allImages
    .map((img) => img.display_order)
    .slice(0, imageCount)
    .sort((a, b) => a - b);

  for (let i = 0; i < displayOrders.length; i++) {
    TestValidator.equals(
      `display_order at position ${i} should equal ${i}`,
      displayOrders[i],
      i,
    );
  }

  // 10. Verify no duplicate display_order values in uploaded set
  const uniqueOrders = new Set(displayOrders);
  TestValidator.predicate(
    "all display_order values are unique within uploaded images",
    uniqueOrders.size === displayOrders.length,
  );

  // 11. Validate image metadata for all uploaded images
  const uploadedImageSet = allImages.slice(0, imageCount);
  for (const image of uploadedImageSet) {
    typia.assert(image);
    TestValidator.predicate(
      "image URL is valid",
      typeof image.image_url === "string" && image.image_url.length > 0,
    );
    TestValidator.predicate(
      "thumbnail URL is valid",
      typeof image.thumbnail_url === "string" && image.thumbnail_url.length > 0,
    );
    TestValidator.predicate(
      "medium URL is valid",
      typeof image.medium_url === "string" && image.medium_url.length > 0,
    );
    TestValidator.predicate(
      "image dimensions are positive",
      image.width_pixels > 0 && image.height_pixels > 0,
    );
    TestValidator.predicate("file size is positive", image.file_size_bytes > 0);
    TestValidator.predicate(
      "display_order is non-negative",
      image.display_order >= 0,
    );
  }

  // 12. Verify created_at timestamps are set
  for (const image of uploadedImageSet) {
    TestValidator.predicate(
      "image has creation timestamp",
      typeof image.created_at === "string" && image.created_at.length > 0,
    );
  }
}
