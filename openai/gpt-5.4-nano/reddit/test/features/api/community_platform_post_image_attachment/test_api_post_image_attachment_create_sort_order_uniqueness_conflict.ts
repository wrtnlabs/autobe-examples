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

export async function test_api_post_image_attachment_create_sort_order_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const imageSortOrder = typia.random<number & tags.Type<"int32">>();
  // 3) Find a postId that is accepted by the attachment creation endpoint by creating an attachment.
  // Once created, the response gives us the real communityPlatformPostId.
  const firstAttachment: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.admin.posts.images.create(
      adminConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          file_url: typia.random<string & tags.Format<"uri">>(),
          content_type: "image/png",
          file_size_bytes: typia.random<number & tags.Type<"int32">>(),
          image_width_px: typia.random<number & tags.Type<"int32">>(),
          image_height_px: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.name(),
          sort_order: imageSortOrder,
        } satisfies ICommunityPlatformPostImage.ICreate,
      },
    );
  typia.assert(firstAttachment);
  TestValidator.equals(
    "sort order matches initial attachment",
    firstAttachment.sortOrder,
    imageSortOrder,
  );
  TestValidator.equals(
    "initial attachment is active",
    firstAttachment.deletedAt,
    null,
  );
  const postId = firstAttachment.communityPlatformPostId;
  // 4) Attempt duplicate attachment with same sort_order for the same post
  await TestValidator.error(
    "duplicate sort_order attachment should conflict",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.create(
        adminConnection,
        {
          postId,
          body: {
            file_url: typia.random<string & tags.Format<"uri">>(),
            content_type: "image/jpeg",
            file_size_bytes: typia.random<number & tags.Type<"int32">>(),
            image_width_px: typia.random<number & tags.Type<"int32">>(),
            image_height_px: typia.random<number & tags.Type<"int32">>(),
            alt_text: RandomGenerator.name(),
            sort_order: imageSortOrder,
          } satisfies ICommunityPlatformPostImage.ICreate,
        },
      );
    },
  );
  // 6) Validate state via captured metadata
  TestValidator.equals(
    "original attachment still active (not soft-deleted)",
    firstAttachment.deletedAt,
    null,
  );
  TestValidator.equals(
    "original attachment sort_order unchanged",
    firstAttachment.sortOrder,
    imageSortOrder,
  );
}
