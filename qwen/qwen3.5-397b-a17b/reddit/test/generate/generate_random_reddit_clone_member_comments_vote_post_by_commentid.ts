import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_vote } from "../prepare/prepare_random_reddit_clone_vote";

export async function generate_random_reddit_clone_member_comments_vote_post_by_commentid(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditCloneVote> {
  const prepared: IRedditCloneVote.ICreate = prepare_random_reddit_clone_vote(
    props.body,
  );
  const result: IRedditCloneVote =
    await api.functional.redditClone.member.comments.vote.postByCommentid(
      connection,
      {
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
