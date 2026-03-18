import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostImageMutation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageMutation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_images_update_referenced_image_must_belong_to_target_post(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The required DTOs for this endpoint are limited to:
  // - ICommunityPlatformPostImage.IRequest
  // - ICommunityPlatformPostImageMutation
  // - ICommunityPlatformPostImage.ISummary
  // Also, only the admin join endpoint auth utility is explicitly available.
  // This test assumes that the environment provides two existing posts
  // (target and other) and at least one active image attachment for the other post.
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
  // Seeded fixtures / harness assumptions:
  // targetPostId: UUID of the post whose images will be patched.
  // otherPostId: UUID of a different post.
  // otherActiveImageId: an active image attachment id belonging to otherPostId.
  // targetActiveImagesBefore: active images list for targetPostId.
  //
  // If your harness uses different names, adapt accordingly.
  const targetPostId = typia.random<string & tags.Format<"uuid">>();
  const otherPostId = typia.random<string & tags.Format<"uuid">>();
  const otherActiveImageId = typia.random<string & tags.Format<"uuid">>();
  const targetActiveImagesBefore =
    await api.functional.communityPlatform.admin.posts.images.updateImages(
      adminConnection,
      {
        postId: targetPostId,
        body: {
          mutations: [
            {
              items: null,
            },
          ] satisfies ICommunityPlatformPostImageMutation[],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformPostImage.IRequest,
      },
    );
  typia.assert(targetActiveImagesBefore);
  await TestValidator.error(
    "must reject image ids that belong to another post",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.updateImages(
        adminConnection,
        {
          postId: targetPostId,
          body: {
            mutations: [
              {
                items: null,
              },
            ] satisfies ICommunityPlatformPostImageMutation[],
            page: null,
            limit: null,
          } satisfies ICommunityPlatformPostImage.IRequest,
        },
      );
    },
  );
  const targetActiveImagesAfter =
    await api.functional.communityPlatform.admin.posts.images.updateImages(
      adminConnection,
      {
        postId: targetPostId,
        body: {
          mutations: [
            {
              items: null,
            },
          ] satisfies ICommunityPlatformPostImageMutation[],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformPostImage.IRequest,
      },
    );
  typia.assert(targetActiveImagesAfter);
  TestValidator.equals(
    "target active attachments must remain unchanged",
    targetActiveImagesAfter,
    targetActiveImagesBefore,
  );
}
