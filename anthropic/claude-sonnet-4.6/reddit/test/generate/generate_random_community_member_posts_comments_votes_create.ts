import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_comment_vote } from "../prepare/prepare_random_community_comment_vote";

export async function generate_random_community_member_posts_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityCommentVote.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<ICommunityCommentVote> {
  const prepared: ICommunityCommentVote.ICreate =
    prepare_random_community_comment_vote(props.body);
  return await api.functional.community.member.posts.comments.votes.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
      commentId: props.params.commentId,
    },
  );
}
