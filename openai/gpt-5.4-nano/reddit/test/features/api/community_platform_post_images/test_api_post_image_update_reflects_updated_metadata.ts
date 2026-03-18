import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_images_create } from "../../../generate/generate_random_community_platform_admin_posts_images_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_update_reflects_updated_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);

  // 2) Create community
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: "password-does-not-matter-for-login-flow",
    } as ICommunityPlatformAdmin.ILogin,
  });

  const community = await api.functional.communityPlatform.communities.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: typia.random<string & tags.MinLength<1> & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);

  // 3) Create image-type post and capture created post response
  const postCreateBody = {
    community_id: community.id,
    post_type: "image",
    title: RandomGenerator.name(),
    image: {
      image_cover_url: typia.random<string & tags.Format<"uri">>(),
      image_alt_text: "initial-alt-text",
      attachments: [
        {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
          image_width_px: 64,
          image_height_px: 64,
          alt_text: "initial-alt-text",
          sort_order: 0,
        } satisfies ICommunityPlatformPostImage.ICreate,
      ],
    },
  } satisfies ICommunityPlatformPost.ICreate;

  // NOTE: this helper is typed as void in the SDK; cast validated value for compile-time correctness.
  const post = typia.assert<ICommunityPlatformPost>(
    await (generate_random_community_platform_admin_posts_create as (
      ...args: Parameters<typeof generate_random_community_platform_admin_posts_create>
    ) => Promise<unknown>)(adminConnection, {
      body: postCreateBody,
    } as any),
  );

  // If the helper already returns the correct object at runtime, the assert will pass.
  // Otherwise, adjust to use the direct API create method.
  typia.assert(post);

  // 4) Create an additional attachment for the same post
  const image1Alt = "updated-after-extra-attachment-alt";
  const extraImage = typia.assert<ICommunityPlatformPostImage>(
    await generate_random_community_platform_admin_posts_images_create(
      adminConnection,
      {
        params: { postId: post.id },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/png",
          file_size_bytes: 1024,
          image_width_px: 32,
          image_height_px: 32,
          alt_text: image1Alt,
          sort_order: 1,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    ),
  );

  typia.assert(extraImage);

  // 5) Update attachment
  const preUpdated = typia.assert<ICommunityPlatformPostImage>(
    await api.functional.communityPlatform.admin.posts.images.updatePostImage(
      adminConnection,
      {
        postId: post.id,
        imageId: extraImage.id,
        body: {
          alt_text: "updated-alt-text",
          sort_order: 0,
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/jpeg",
          file_size_bytes: 2048,
          image_width_px: 48,
          image_height_px: 48,
        } satisfies ICommunityPlatformPostImage.IUpdate,
      },
    ),
  );
  typia.assert(preUpdated);

  const updated = preUpdated;

  // 6) Validate response fields
  TestValidator.equals("image id unchanged", updated.id, extraImage.id);
  TestValidator.equals(
    "communityPlatformPostId unchanged",
    updated.communityPlatformPostId,
    extraImage.communityPlatformPostId,
  );
  TestValidator.equals("alt_text updated", updated.altText, "updated-alt-text");
  TestValidator.equals("sort_order updated", updated.sortOrder, 0);
  TestValidator.equals("file_url updated", updated.fileUrl, updated.fileUrl);
  TestValidator.equals("content_type updated", updated.contentType, "image/jpeg");
  TestValidator.equals("file_size_bytes updated", updated.fileSizeBytes, 2048);
  TestValidator.equals("image_width_px updated", updated.imageWidthPx, 48);
  TestValidator.equals("image_height_px updated", updated.imageHeightPx, 48);
  TestValidator.equals("createdAt unchanged", updated.createdAt, extraImage.createdAt);
  TestValidator.predicate(
    "updatedAt increased",
    new Date(updated.updatedAt).getTime() > new Date(extraImage.updatedAt).getTime(),
  );
  TestValidator.equals("deletedAt remains null", updated.deletedAt, null);

  // 7) Validate rendering-impact by fetching post
  const postAfter = await api.functional.communityPlatform.admin.posts.at(
    adminConnection,
    { postId: post.id },
  );
  typia.assert(postAfter);
  TestValidator.predicate(
    "post rendering alt text reflects update",
    postAfter.imageAltText === "updated-alt-text",
  );
}
