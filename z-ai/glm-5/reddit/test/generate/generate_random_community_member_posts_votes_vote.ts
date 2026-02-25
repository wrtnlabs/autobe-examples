import api from "@ORGANIZATION/PROJECT-api";
import { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_community_post_vote } from "../prepare/prepare_random_community_post_vote";

export async function generate_random_community_member_posts_votes_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPostVote.ICreate> | undefined;
    params: {
      postId: string;
    };
  }
): Promise<ICommunityPostVote> {
  const prepared: ICommunityPostVote.ICreate = prepare_random_community_post_vote(
    props.body
  );
  return await api.functional.community.member.posts.votes.vote(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}