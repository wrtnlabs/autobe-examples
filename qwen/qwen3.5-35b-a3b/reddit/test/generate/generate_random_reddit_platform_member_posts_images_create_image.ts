import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_post_image } from "../prepare/prepare_random_reddit_platform_post_image";

export async function generate_random_reddit_platform_member_posts_images_create_image(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformPostImage.ICreate>;
    params?: {
      postId: string;
    };
  },
): Promise<IRedditPlatformPostImage> {
  const prepared: IRedditPlatformPostImage.ICreate =
    prepare_random_reddit_platform_post_image(props.body);
  const result: IRedditPlatformPostImage =
    await api.functional.redditPlatform.member.posts.images.createImage(
      connection,
      {
        postId: (props.params?.postId ?? "") satisfies string as string & tags.Format<"uuid">,
        body: prepared,
      },
    );
  return result;
}