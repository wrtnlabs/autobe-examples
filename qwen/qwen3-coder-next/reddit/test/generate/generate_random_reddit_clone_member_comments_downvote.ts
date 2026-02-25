import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_content_post_vote } from "../prepare/prepare_random_reddit_clone_content_post_vote";

export async function generate_random_reddit_clone_member_comments_downvote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneContentPostVote.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditCloneContentPostVote> {
  const prepared: IRedditCloneContentPostVote.ICreate =
    prepare_random_reddit_clone_content_post_vote(props.body);
  return await api.functional.redditClone.member.comments.downvote(connection, {
    body: prepared,
    commentId: props.params.commentId,
  });
}
