import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_post_image } from "../prepare/prepare_random_reddit_clone_post_image";

export async function generate_random_reddit_clone_member_posts_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostImage.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<IRedditClonePostImage> {
  const prepared: IRedditClonePostImage.ICreate =
    prepare_random_reddit_clone_post_image(props.body);
  return await api.functional.redditClone.member.posts.images.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
