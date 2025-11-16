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
 * Test image upload with URL validation in community platform posts.
 *
 * Validates that the image upload endpoint properly validates image URLs
 * (image_url, thumbnail_url, medium_url) to ensure they are valid URIs in CDN
 * format. Tests both successful uploads with valid URLs and error scenarios
 * with malformed URLs.
 *
 * Test workflow:
 *
 * 1. Create member account for testing
 * 2. Create community to host test post
 * 3. Create post for image attachment
 * 4. Test successful image upload with valid CDN URLs
 * 5. Test validation errors for malformed URIs
 * 6. Test with unreachable but valid format URLs
 * 7. Verify proper error responses for invalid URL formats
 */
export async function test_api_post_image_upload_url_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", member.id !== null);

  // Step 2: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community created successfully",
    community.id !== null,
  );

  // Step 3: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);
  TestValidator.predicate("post created successfully", post.id !== null);

  // Step 4: Test successful image upload with valid CDN URLs
  const validImageData = {
    image_url: "https://cdn.example.com/images/product/abcd1234.jpg",
    thumbnail_url: "https://cdn.example.com/images/product/abcd1234-thumb.jpg",
    medium_url: "https://cdn.example.com/images/product/abcd1234-medium.jpg",
    alt_text: "Test product image",
    width_pixels: 1200,
    height_pixels: 800,
    file_size_bytes: 524288,
    display_order: 0,
  };

  const uploadResponse: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: validImageData satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(uploadResponse);
  TestValidator.predicate(
    "valid image upload succeeds",
    uploadResponse.data.length > 0,
  );
  TestValidator.equals(
    "first image has correct display order",
    uploadResponse.data[0].display_order,
    0,
  );

  // Step 5: Test validation error for invalid image_url (non-URI format)
  await TestValidator.error(
    "should reject invalid image_url format",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: "not-a-valid-uri",
            thumbnail_url: "https://cdn.example.com/thumb.jpg",
            medium_url: "https://cdn.example.com/medium.jpg",
            width_pixels: 800,
            height_pixels: 600,
            file_size_bytes: 262144,
            display_order: 1,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );

  // Step 6: Test validation error for invalid thumbnail_url
  await TestValidator.error(
    "should reject invalid thumbnail_url format",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: "https://cdn.example.com/image.jpg",
            thumbnail_url: "malformed-url-without-scheme",
            medium_url: "https://cdn.example.com/medium.jpg",
            width_pixels: 800,
            height_pixels: 600,
            file_size_bytes: 262144,
            display_order: 2,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );

  // Step 7: Test validation error for invalid medium_url
  await TestValidator.error(
    "should reject invalid medium_url format",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: "https://cdn.example.com/image.jpg",
            thumbnail_url: "https://cdn.example.com/thumb.jpg",
            medium_url: "http:/invalid-url-structure",
            width_pixels: 800,
            height_pixels: 600,
            file_size_bytes: 262144,
            display_order: 3,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );

  // Step 8: Test with properly formatted but unreachable URLs
  const unreachableValidImage = {
    image_url: "https://unreachable-cdn.example.local/image/xyz789.png",
    thumbnail_url:
      "https://unreachable-cdn.example.local/image/xyz789-thumb.png",
    medium_url: "https://unreachable-cdn.example.local/image/xyz789-medium.png",
    alt_text: "Unreachable but valid format image",
    width_pixels: 1600,
    height_pixels: 1000,
    file_size_bytes: 786432,
    display_order: 1,
  };

  const unreachableUpload: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: unreachableValidImage satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(unreachableUpload);
  TestValidator.predicate(
    "unreachable but valid format URLs are accepted",
    unreachableUpload.data.length > 0,
  );

  // Step 9: Verify stored image has correct properties
  const storedImage = unreachableUpload.data[0];
  TestValidator.equals(
    "stored image_url matches input",
    storedImage.image_url,
    unreachableValidImage.image_url,
  );
  TestValidator.equals(
    "stored thumbnail_url matches input",
    storedImage.thumbnail_url,
    unreachableValidImage.thumbnail_url,
  );
  TestValidator.equals(
    "stored medium_url matches input",
    storedImage.medium_url,
    unreachableValidImage.medium_url,
  );
  TestValidator.equals(
    "stored width_pixels matches input",
    storedImage.width_pixels,
    unreachableValidImage.width_pixels,
  );
  TestValidator.equals(
    "stored height_pixels matches input",
    storedImage.height_pixels,
    unreachableValidImage.height_pixels,
  );
}
