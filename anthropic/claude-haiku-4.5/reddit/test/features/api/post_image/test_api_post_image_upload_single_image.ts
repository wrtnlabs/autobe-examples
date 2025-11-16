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
 * Test successful upload of a single image to a post with complete metadata
 * validation.
 *
 * This test validates the complete image upload workflow including:
 *
 * - Member account creation and authentication
 * - Community creation for hosting content
 * - Post creation within the community
 * - Single image upload with all metadata fields
 * - Response validation confirming image attachment with proper metadata
 *
 * The workflow verifies that images are correctly stored, indexed by display
 * order, and returned with all required metadata intact through paginated
 * responses.
 *
 * 1. Create a new member account to establish ownership context
 * 2. Create a community to provide a host for the post
 * 3. Create a post within that community
 * 4. Upload a single image with complete metadata (URLs, dimensions, file size,
 *    alt text, display order)
 * 5. Validate the response contains the image with correct pagination and metadata
 * 6. Verify image is properly indexed at the specified display order
 */
export async function test_api_post_image_upload_single_image(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(memberResponse);
  const memberId = memberResponse.id;

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(15).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "text_and_images" as const,
    category_slug: "technology",
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);
  const communityId = community.id;

  // Step 3: Create a post
  const postData = {
    community_id: communityId,
    post_type: "image" as const,
    title: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    { body: postData },
  );
  typia.assert(post);
  const postId = post.id;

  // Step 4: Upload a single image with complete metadata
  const imageData = {
    image_url: typia.random<string & tags.Format<"uri">>(),
    thumbnail_url: typia.random<string & tags.Format<"uri">>(),
    medium_url: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    width_pixels: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height_pixels: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    file_size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    display_order: 0,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResponse =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: postId,
        body: imageData,
      },
    );
  typia.assert(imageResponse);

  // Step 5: Validate the response structure and pagination
  TestValidator.predicate(
    "response should contain pagination info",
    imageResponse.pagination !== undefined,
  );
  typia.assert(imageResponse.pagination);

  TestValidator.equals(
    "pagination should have correct current page",
    imageResponse.pagination.current,
    0,
  );

  TestValidator.predicate(
    "response should contain image data array",
    Array.isArray(imageResponse.data),
  );

  // Step 6: Verify the uploaded image in the response
  TestValidator.predicate(
    "response data should contain at least one image",
    imageResponse.data.length > 0,
  );

  const uploadedImage = imageResponse.data[0];
  typia.assert(uploadedImage);

  TestValidator.equals(
    "uploaded image should have correct image_url",
    uploadedImage.image_url,
    imageData.image_url,
  );

  TestValidator.equals(
    "uploaded image should have correct thumbnail_url",
    uploadedImage.thumbnail_url,
    imageData.thumbnail_url,
  );

  TestValidator.equals(
    "uploaded image should have correct medium_url",
    uploadedImage.medium_url,
    imageData.medium_url,
  );

  TestValidator.equals(
    "uploaded image should have correct alt_text",
    uploadedImage.alt_text,
    imageData.alt_text,
  );

  TestValidator.equals(
    "uploaded image should have correct width_pixels",
    uploadedImage.width_pixels,
    imageData.width_pixels,
  );

  TestValidator.equals(
    "uploaded image should have correct height_pixels",
    uploadedImage.height_pixels,
    imageData.height_pixels,
  );

  TestValidator.equals(
    "uploaded image should have correct file_size_bytes",
    uploadedImage.file_size_bytes,
    imageData.file_size_bytes,
  );

  TestValidator.equals(
    "uploaded image should have correct display_order",
    uploadedImage.display_order,
    imageData.display_order,
  );

  TestValidator.equals(
    "uploaded image should belong to the correct post",
    uploadedImage.community_platform_post_id,
    postId,
  );

  TestValidator.predicate(
    "uploaded image should have valid creation timestamp",
    uploadedImage.created_at !== null && uploadedImage.created_at !== undefined,
  );
}
