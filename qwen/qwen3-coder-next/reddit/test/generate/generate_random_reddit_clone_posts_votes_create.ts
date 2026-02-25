import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_content_post_vote } from "../prepare/prepare_random_reddit_clone_content_post_vote";

export async function generate_random_reddit_clone_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneContentPostVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditCloneContentPostVote> {
  const prepared: IRedditCloneContentPostVote.ICreate =
    prepare_random_reddit_clone_content_post_vote(props.body);
  const result: IRedditCloneContentPostVote =
    await api.functional.redditClone.posts.votes.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
