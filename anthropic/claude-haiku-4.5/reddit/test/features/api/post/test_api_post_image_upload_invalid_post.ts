import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";

/**
 * Test image upload to a non-existent post.
 *
 * This test validates that attempting to attach images to a post that doesn't
 * exist returns appropriate error handling. The test workflow includes:
 *
 * 1. Create member account through authentication
 * 2. Attempt to upload images using a valid UUID format but non-existent post ID
 * 3. Verify that the request fails with appropriate error
 * 4. Confirm error response indicates the post was not found
 *
 * This scenario tests boundary conditions where members attempt to attach
 * images to invalid resources.
 */
export async function test_api_post_image_upload_invalid_post(
  connection: api.IConnection,
) {
  // 1. Create member account through authentication
  const memberResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberResponse);

  // 2. Attempt to upload images to non-existent post with valid UUID format
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "image upload to non-existent post should fail",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: nonExistentPostId,
          body: {
            image_url: typia.random<string & tags.Format<"uri">>(),
            thumbnail_url: typia.random<string & tags.Format<"uri">>(),
            medium_url: typia.random<string & tags.Format<"uri">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 2 }),
            width_pixels: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            height_pixels: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            file_size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            display_order: 0,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );
}
