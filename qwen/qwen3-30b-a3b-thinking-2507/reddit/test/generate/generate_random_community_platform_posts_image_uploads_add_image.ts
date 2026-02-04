import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImageUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImageUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_image_upload } from "../prepare/prepare_random_community_platform_post_image_upload";

export async function generate_random_community_platform_posts_image_uploads_add_image(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostImageUpload.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostImageUpload> {
  const prepared: ICommunityPlatformPostImageUpload.ICreate =
    prepare_random_community_platform_post_image_upload(props.body);
  return await api.functional.communityPlatform.posts.image_uploads.addImage(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
