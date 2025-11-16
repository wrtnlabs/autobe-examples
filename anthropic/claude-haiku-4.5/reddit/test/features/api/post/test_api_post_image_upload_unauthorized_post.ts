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
 * Test that a member cannot upload images to another member's post.
 *
 * Verify authorization controls - only the post creator and moderators should
 * be able to attach images. The test workflow includes: (1) Create first member
 * account, (2) Create community and post under first member, (3) Create second
 * member account (unauthorized user), (4) Attempt to upload images to the first
 * member's post using second member's credentials, (5) Verify the request fails
 * with authorization error (typically 403 Forbidden). This scenario validates
 * that image upload permissions are properly enforced and prevents unauthorized
 * modification of other members' posts.
 */
export async function test_api_post_image_upload_unauthorized_post(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (post creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorData = {
    email: creatorEmail,
    username: RandomGenerator.name(1),
    password: "SecurePass123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const creatorAuthorized = await api.functional.auth.member.join(connection, {
    body: creatorData,
  });
  typia.assert(creatorAuthorized);

  // Step 2: Create community under first member
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: RandomGenerator.alphabets(8).toLowerCase(),
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

  // Step 3: Create post under first member
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

  // Step 4: Create second member account (unauthorized user)
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedData = {
    email: unauthorizedEmail,
    username: RandomGenerator.name(1),
    password: "SecurePass456!",
    ip: "192.168.1.2",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const unauthorizedAuthorized = await api.functional.auth.member.join(
    connection,
    {
      body: unauthorizedData,
    },
  );
  typia.assert(unauthorizedAuthorized);

  // Step 5: Attempt to upload images with unauthorized user credentials and verify failure
  const imageUploadData = {
    image_url: typia.random<string & tags.Format<"uri">>(),
    thumbnail_url: typia.random<string & tags.Format<"uri">>(),
    medium_url: typia.random<string & tags.Format<"uri">>(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    width_pixels: 800,
    height_pixels: 600,
    file_size_bytes: 102400,
    display_order: 0,
  } satisfies ICommunityPlatformPostImage.ICreate;

  await TestValidator.error(
    "unauthorized user should not be able to upload images to another member's post",
    async () => {
      await api.functional.communityPlatform.member.posts.images.create(
        connection,
        {
          postId: post.id,
          body: imageUploadData,
        },
      );
    },
  );
}
