import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";

import { prepare_random_reddit_clone_post_vote } from "../prepare/prepare_random_reddit_clone_post_vote";

export async function generate_random_reddit_clone_member_reddit_clone_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostVote.ICreate>;
    params: {
      postId: string;
    };
  }
): Promise<IRedditClonePostVote> {
  const prepared: IRedditClonePostVote.ICreate = prepare_random_reddit_clone_post_vote(
    props.body,
  );
  const result: IRedditClonePostVote =
    await api.functional.redditClone.member.redditClone.posts.votes.create(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
