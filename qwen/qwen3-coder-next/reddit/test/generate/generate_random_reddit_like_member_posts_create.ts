import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_post } from "../prepare/prepare_random_reddit_like_post";

export async function generate_random_reddit_like_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikePost.ICreate> | undefined;
  },
): Promise<IRedditLikePost> {
  const prepared: IRedditLikePost.ICreate = prepare_random_reddit_like_post(
    props.body,
  );
  return await api.functional.redditLike.member.posts.create(connection, {
    body: prepared,
  });
}
