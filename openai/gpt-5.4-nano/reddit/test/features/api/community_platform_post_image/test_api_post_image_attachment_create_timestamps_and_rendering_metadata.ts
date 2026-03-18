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

export async function test_api_post_image_attachment_create_timestamps_and_rendering_metadata(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Use join utility since DTOs for login are not provided; join returns IAuthorized with token.
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const fileUrl = typia.random<string & tags.Format<"uri">>();
  const altText = RandomGenerator.paragraph({ sentences: 1 });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const attachment =
    await api.functional.communityPlatform.admin.posts.images.create(
      adminConnection,
      {
        postId,
        body: {
          file_url: fileUrl,
          content_type: "image/jpeg",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          image_width_px: typia.random<number & tags.Type<"int32">>(),
          image_height_px: typia.random<number & tags.Type<"int32">>(),
          alt_text: altText,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(attachment);
  // typia.assert already validates timestamp formats
  TestValidator.predicate("updatedAt close to createdAt", () => {
    const createdAtMs = Date.parse(attachment.createdAt);
    const updatedAtMs = Date.parse(attachment.updatedAt);
    return Math.abs(updatedAtMs - createdAtMs) < 5000;
  });
  TestValidator.equals(
    "deletedAt should be null on create",
    attachment.deletedAt,
    null,
  );
  // Rendering metadata linkage
  TestValidator.equals("fileUrl matches input", attachment.fileUrl, fileUrl);
  TestValidator.equals("altText matches input", attachment.altText, altText);
}
