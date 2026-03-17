import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_post_vote } from "../prepare/prepare_random_reddit_clone_post_vote";

export async function generate_random_reddit_clone_member_posts_votes_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostVote.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditClonePostVote> {
  const prepared: IRedditClonePostVote.ICreate =
    prepare_random_reddit_clone_post_vote(props.body);
  const result: IRedditClonePostVote =
    await api.functional.redditClone.member.posts.votes.vote(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
