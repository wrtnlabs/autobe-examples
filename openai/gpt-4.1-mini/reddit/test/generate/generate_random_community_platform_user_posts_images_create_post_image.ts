import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_image } from "../prepare/prepare_random_community_platform_post_image";

export async function generate_random_community_platform_user_posts_images_create_post_image(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostImage.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostImage> {
  const prepared: ICommunityPlatformPostImage.ICreate =
    prepare_random_community_platform_post_image(props.body);
  const result: ICommunityPlatformPostImage =
    await api.functional.communityPlatform.user.posts.images.createPostImage(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
