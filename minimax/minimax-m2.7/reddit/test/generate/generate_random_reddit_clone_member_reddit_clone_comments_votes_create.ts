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

export async function generate_random_reddit_clone_member_reddit_clone_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditClonePostVote.IUpsert> {
  const prepared: IRedditClonePostVote.ICreate =
    prepare_random_reddit_clone_post_vote(props.body);
  const result: IRedditClonePostVote.IUpsert =
    await api.functional.redditClone.member.redditClone.comments.votes.create(
      connection,
      {
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
