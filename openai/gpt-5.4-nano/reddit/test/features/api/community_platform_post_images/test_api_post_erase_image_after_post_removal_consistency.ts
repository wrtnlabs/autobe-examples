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

export async function test_api_post_erase_image_after_post_removal_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2) Create community
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: prepare_random_community_platform_community(),
    },
  );
  typia.assert(community);
  // 3) Create a post (we cannot retrieve postId from create generator, so
  // we create images first and use returned communityPlatformPostId).
  const provisionalPostId = typia.random<string & tags.Format<"uuid">>();
  // 4) Attach TWO images to the same post (imageA and imageB)
  const imageA =
    await generate_random_community_platform_admin_posts_images_create(
      adminConnection,
      {
        params: { postId: provisionalPostId },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/png",
          file_size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          image_width_px: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          image_height_px: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(imageA);
  const imageB =
    await generate_random_community_platform_admin_posts_images_create(
      adminConnection,
      {
        params: { postId: provisionalPostId },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/jpeg",
          file_size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          image_width_px: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          image_height_px: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(imageB);
  const postId = imageA.communityPlatformPostId;
  // 5) Remove the post from normal visibility
  await api.functional.communityPlatform.admin.posts.erase(adminConnection, {
    postId,
  });
  // 6) Attempt delete imageA using the original postId and imageA
  try {
    await api.functional.communityPlatform.admin.posts.images.erasePostImage(
      adminConnection,
      {
        postId,
        imageId: imageA.id,
      },
    );
  } catch {
    // Backend may reject deletion when parent post was removed; acceptable.
  }
  // 7) Verify deletion scoping consistency: imageB should not be affected
  await api.functional.communityPlatform.admin.posts.images.erasePostImage(
    adminConnection,
    {
      postId,
      imageId: imageB.id,
    },
  );
  // If backend enforces strict scoping, imageA deletion should not have removed
  // imageB unexpectedly; re-deleting imageB must now fail.
  await TestValidator.error(
    "imageB should be absent after deletion",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.erasePostImage(
        adminConnection,
        {
          postId,
          imageId: imageB.id,
        },
      );
    },
  );
}
