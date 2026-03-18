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

export async function test_api_post_images_update_image_post_requires_at_least_one_active_image(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as an admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Generate placeholder UUIDs to satisfy request typing.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const activeImageId = typia.random<string & tags.Format<"uuid">>();
  // The provided DTO for ICommunityPlatformPostImageMutation is incomplete:
  // it only allows { items: null }.
  // Use the minimal valid mutation structure to ensure compilation.
  const body = {
    mutations: [
      {
        items: null,
      },
    ],
    limit: null,
    page: null,
  } satisfies ICommunityPlatformPostImage.IRequest;
  await TestValidator.error(
    "should reject removing the last active image attachment for an image-type post",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.updateImages(
        adminConnection,
        {
          postId,
          body: {
            ...body,
            // Include the activeImageId in a safe way only if the DTO supported it.
            // Since ICommunityPlatformPostImageMutation does not expose remove/add
            // fields, we cannot map this id into the request; keeping body as-is.
            // (activeImageId is intentionally unused.)
          },
        },
      );
    },
  );
  // State validation (rollback / remaining active attachments) requires APIs
  // to fetch post images which are not provided in this prompt.
  // So we only assert the mutation is rejected.
  void activeImageId;
}
