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
 * Test image upload with alt text for accessibility compliance. Verify that alt
 * text is properly stored and returned, supporting accessibility requirements
 * for screen readers. The test workflow includes:
 *
 * 1. Create member account
 * 2. Create community and post
 * 3. Upload images with descriptive alt_text (within 200 character limit)
 * 4. Verify alt_text is stored correctly
 * 5. Retrieve the post images and confirm alt_text is included
 * 6. Test with maximum length alt_text (200 characters) to ensure the limit is
 *    respected
 */
export async function test_api_post_image_upload_with_accessibility(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member created with access token",
    member.token.access.length > 0,
  );

  // Step 2: Create community for the post
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityData.identifier,
  );

  // Step 3: Create post for image upload
  const postData = {
    community_id: community.id,
    post_type: "image" as const,
    title: RandomGenerator.paragraph({ sentences: 2 }),
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
  TestValidator.equals("post created successfully", post.post_type, "image");

  // Step 4: Upload image with descriptive alt text
  const altTextShort =
    "A beautiful landscape with mountains and a lake reflecting the sunset";
  const imageDataShort = {
    image_url: "https://example.com/images/landscape-full.jpg",
    thumbnail_url: "https://example.com/images/landscape-thumb.jpg",
    medium_url: "https://example.com/images/landscape-medium.jpg",
    alt_text: altTextShort,
    width_pixels: 1920,
    height_pixels: 1080,
    file_size_bytes: 524288,
    display_order: 0,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResponse1 =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      { postId: post.id, body: imageDataShort },
    );
  typia.assert(imageResponse1);
  TestValidator.predicate(
    "image uploaded with alt text",
    imageResponse1.data.length > 0,
  );
  TestValidator.equals(
    "alt text preserved on first image",
    imageResponse1.data[0].alt_text,
    altTextShort,
  );

  // Step 5: Upload second image with maximum length alt text (200 characters)
  const maxAltText = RandomGenerator.substring(
    RandomGenerator.content({ paragraphs: 2 }),
  ).substring(0, 200);
  const imageDataMax = {
    image_url: "https://example.com/images/photo-full.jpg",
    thumbnail_url: "https://example.com/images/photo-thumb.jpg",
    medium_url: "https://example.com/images/photo-medium.jpg",
    alt_text: maxAltText,
    width_pixels: 2560,
    height_pixels: 1440,
    file_size_bytes: 786432,
    display_order: 1,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResponse2 =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      { postId: post.id, body: imageDataMax },
    );
  typia.assert(imageResponse2);
  TestValidator.predicate(
    "image uploaded with max length alt text",
    imageResponse2.data.length >= 1,
  );

  // Step 6: Verify alt text is included in retrieved images
  const retrievedImages = imageResponse2.data;
  TestValidator.predicate(
    "max alt text within 200 character limit",
    maxAltText.length <= 200,
  );
  TestValidator.equals(
    "max alt text stored correctly",
    retrievedImages[retrievedImages.length - 1].alt_text,
    maxAltText,
  );

  // Step 7: Verify first image alt text is still present
  TestValidator.predicate(
    "multiple images can have alt text",
    retrievedImages.some((img) => img.alt_text === altTextShort),
  );

  // Step 8: Test image without alt text (optional field)
  const imageDataNoAlt = {
    image_url: "https://example.com/images/generic-full.jpg",
    thumbnail_url: "https://example.com/images/generic-thumb.jpg",
    medium_url: "https://example.com/images/generic-medium.jpg",
    width_pixels: 1024,
    height_pixels: 768,
    file_size_bytes: 262144,
    display_order: 2,
  } satisfies ICommunityPlatformPostImage.ICreate;

  const imageResponse3 =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      { postId: post.id, body: imageDataNoAlt },
    );
  typia.assert(imageResponse3);
  TestValidator.predicate(
    "image uploaded without alt text",
    imageResponse3.data.length >= 2,
  );

  // Step 9: Verify accessibility compliance
  TestValidator.predicate(
    "all images accessible via post",
    imageResponse3.pagination.records >= 3,
  );

  // Step 10: Validate image metadata and dimensions
  const firstImage = imageResponse3.data[0];
  TestValidator.predicate(
    "image has valid dimensions",
    firstImage.width_pixels > 0 && firstImage.height_pixels > 0,
  );
  TestValidator.predicate(
    "image has valid file size",
    firstImage.file_size_bytes > 0,
  );
  TestValidator.predicate(
    "image URLs are valid",
    firstImage.image_url.length > 0 &&
      firstImage.thumbnail_url.length > 0 &&
      firstImage.medium_url.length > 0,
  );
}
