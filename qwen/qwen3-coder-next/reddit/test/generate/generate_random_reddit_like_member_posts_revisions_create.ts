import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_post_revision } from "../prepare/prepare_random_reddit_like_post_revision";

export async function generate_random_reddit_like_member_posts_revisions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikePostRevision.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<void> {
  const prepared: IRedditLikePostRevision.ICreate =
    prepare_random_reddit_like_post_revision(props.body);
  return await api.functional.redditLike.member.posts.revisions.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
