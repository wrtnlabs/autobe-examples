import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_attachment_not_found_when_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as an admin (setup authentication)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2) Create a post image attachment (postId is needed for scoping)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const imageAttachment: ICommunityPlatformPostImage =
    await generate_random_community_platform_admin_posts_images_create(
      adminConnection,
      {
        params: { postId },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          image_width_px: typia.random<number & tags.Type<"int32">>(),
          image_height_px: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.name(),
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(imageAttachment);
  // 3) Delete the attachment
  await api.functional.communityPlatform.admin.posts.images.erasePostImage(
    adminConnection,
    {
      postId,
      imageId: imageAttachment.id,
    },
  );
  // 4) Retrieval must fail as not found
  await TestValidator.httpError(
    "deleted image attachment should not be retrievable",
    404,
    async () =>
      await api.functional.communityPlatform.admin.posts.images.at(
        adminConnection,
        {
          postId,
          imageId: imageAttachment.id,
        },
      ),
  );
}
