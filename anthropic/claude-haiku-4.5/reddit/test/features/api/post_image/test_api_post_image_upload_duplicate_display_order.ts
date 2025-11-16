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

export async function test_api_post_image_upload_duplicate_display_order(
  connection: api.IConnection,
) {
  // Step 1: Create member account for image upload testing
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community to host the test post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post for testing display_order uniqueness
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "image",
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Upload first image with display_order: 0
  const firstImageResponse: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
          medium_url: typia.random<string & tags.Format<"uri">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          width_pixels: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          height_pixels: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          file_size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          display_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(firstImageResponse);
  TestValidator.predicate(
    "first image uploaded successfully",
    firstImageResponse.data.length > 0,
  );

  // Step 5: Attempt to upload second image with display_order: 0 (duplicate)
  await TestValidator.error(
    "duplicate display_order should be rejected",
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
            width_pixels: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            height_pixels: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            file_size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            display_order: 0,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );

  // Step 6: Verify that uploading with a unique display_order works
  const secondImageResponse: IPageICommunityPlatformPostImage =
    await api.functional.communityPlatform.member.posts.images.create(
      connection,
      {
        postId: post.id,
        body: {
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
          medium_url: typia.random<string & tags.Format<"uri">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          width_pixels: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          height_pixels: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          file_size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          display_order: 1,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(secondImageResponse);
  TestValidator.predicate(
    "second image with unique display_order uploaded successfully",
    secondImageResponse.data.length > 0,
  );
}
