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

export async function test_api_post_image_attachment_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
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
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Create prerequisite post
  await generate_random_community_platform_admin_posts_create(adminConnection, {
    body: {
      community_id: typia.random<string & tags.Format<"uuid">>(),
      post_type: "image",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      image: {
        image_cover_url: typia.random<string & tags.Format<"uri">>(),
        image_alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        attachments: [
          {
            file_url: typia.random<string & tags.Format<"uri">>(),
            content_type: "image/png",
            file_size_bytes: typia.random<number & tags.Type<"int32">>(),
            image_width_px: typia.random<number & tags.Type<"int32">>(),
            image_height_px: typia.random<number & tags.Type<"int32">>(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            sort_order: 0 satisfies number as number & tags.Type<"int32">,
          } satisfies ICommunityPlatformPostImage.ICreate,
        ],
      },
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // Create active image attachment
  const createdImage =
    await generate_random_community_platform_admin_posts_images_create(
      adminConnection,
      {
        params: {
          postId,
        },
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          image_width_px: typia.random<number & tags.Type<"int32">>(),
          image_height_px: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          sort_order: 0 satisfies number as number & tags.Type<"int32">,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(createdImage);
  const imageId = createdImage.id;
  // Retrieve (first time)
  const retrieved1 =
    await api.functional.communityPlatform.admin.posts.images.at(
      adminConnection,
      {
        postId,
        imageId,
      },
    );
  typia.assert(retrieved1);
  TestValidator.equals(
    "communityPlatformPostId matches",
    retrieved1.communityPlatformPostId,
    postId,
  );
  TestValidator.equals("id matches", retrieved1.id, imageId);
  TestValidator.equals("deletedAt is null", retrieved1.deletedAt, null);
  // Ensure no mutation occurred (repeat call)
  const retrieved2 =
    await api.functional.communityPlatform.admin.posts.images.at(
      adminConnection,
      {
        postId,
        imageId,
      },
    );
  typia.assert(retrieved2);
  TestValidator.equals(
    "fileUrl stable",
    retrieved2.fileUrl,
    retrieved1.fileUrl,
  );
  TestValidator.equals(
    "contentType stable",
    retrieved2.contentType,
    retrieved1.contentType,
  );
  TestValidator.equals(
    "sortOrder stable",
    retrieved2.sortOrder,
    retrieved1.sortOrder,
  );
  TestValidator.equals(
    "deletedAt stable",
    retrieved2.deletedAt,
    retrieved1.deletedAt,
  );
}
