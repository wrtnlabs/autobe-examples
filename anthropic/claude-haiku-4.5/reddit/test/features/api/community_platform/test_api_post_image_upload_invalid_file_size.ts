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
 * Test image upload with invalid file_size_bytes values.
 *
 * Validates that the image upload endpoint properly validates the
 * file_size_bytes metadata field. Tests invalid file size values including
 * negative values to ensure proper constraint validation.
 *
 * Test workflow:
 *
 * 1. Create member account via authentication
 * 2. Create community to host test post
 * 3. Create post within the community
 * 4. Attempt upload with negative file_size_bytes value (constraint violation)
 * 5. Verify API rejects invalid file size metadata
 * 6. Confirm valid positive file_size_bytes values work correctly
 */
export async function test_api_post_image_upload_invalid_file_size(
  connection: api.IConnection,
) {
  // Step 1: Create member account via authentication
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(15),
        password: "TestPass123!@#",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community to host test post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post within the community
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

  // Step 4: Test negative file_size_bytes value (violates Minimum<0> constraint)
  await TestValidator.error(
    "should reject negative file_size_bytes",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            thumbnail_url: typia.random<string & tags.Format<"uri">>(),
            medium_url: typia.random<string & tags.Format<"uri">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            width_pixels: 800,
            height_pixels: 600,
            file_size_bytes: -1,
            display_order: 0,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );

  // Step 5: Verify valid positive file_size_bytes works correctly
  const validImage: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
          medium_url: typia.random<string & tags.Format<"uri">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          width_pixels: 800,
          height_pixels: 600,
          file_size_bytes: 102400,
          display_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(validImage);
  TestValidator.predicate(
    "valid image with positive file_size_bytes should be created",
    validImage.data.length > 0,
  );

  // Step 6: Verify another valid image upload with different file size
  const anotherValidImage: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
          medium_url: typia.random<string & tags.Format<"uri">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          width_pixels: 1920,
          height_pixels: 1080,
          file_size_bytes: 1048576,
          display_order: 1,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(anotherValidImage);
  TestValidator.equals(
    "second image should have different display order",
    anotherValidImage.data.length,
    2,
  );
}
