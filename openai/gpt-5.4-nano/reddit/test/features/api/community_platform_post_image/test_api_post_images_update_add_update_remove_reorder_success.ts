import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostImageMutation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageMutation";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_admin_login } from "../../../authorize/authorize_admin_login";

export async function test_api_post_images_update_add_update_remove_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  const postId = typia.random<string & tags.Format<"uuid">>();

  // Mutations payload: mutations: ICommunityPlatformPostImageMutation[]
  const updateReq = {
    mutations: [
      typia.assert<ICommunityPlatformPostImageMutation>({
        mutationType: "add",
        items: [
          {
            mutationType: "add",
            file_url: typia.random<string & tags.Format<"url">>(),
            content_type: "image/png",
            file_size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            image_width_px: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            image_height_px: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            alt_text: typia.random<string>(),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          },
        ],
      }),
      typia.assert<ICommunityPlatformPostImageMutation>({
        mutationType: "update",
        items: [
          {
            mutationType: "update",
            id: typia.random<string & tags.Format<"uuid">>(),
            alt_text: typia.random<string>(),
            sort_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          },
        ],
      }),
      typia.assert<ICommunityPlatformPostImageMutation>({
        mutationType: "remove",
        items: [
          {
            mutationType: "remove",
            id: typia.random<string & tags.Format<"uuid">>(),
          },
        ],
      }),
    ],
    page: null,
    limit: null,
  } satisfies ICommunityPlatformPostImage.IRequest;

  const response =
    await api.functional.communityPlatform.admin.posts.images.updateImages(
      adminConnection,
      {
        postId,
        body: updateReq,
      },
    );

  typia.assert(response);

  const items = typia.assert<Array<{
    id: string;
    sort_order: number;
    deleted_at: null | string;
  }>>(response as unknown);

  for (const item of items) {
    typia.assert(item);
    typia.assert(item.deleted_at === null);
  }

  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  typia.assert(sorted);

  const ids1 = items.map((x: { id: string }) => x.id);
  const ids2 = sorted.map((x: { id: string }) => x.id);

  typia.assert(ids1.length === ids2.length);
}
