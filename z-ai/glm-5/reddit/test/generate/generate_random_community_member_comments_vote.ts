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

export async function generate_random_community_member_comments_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityCommentVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<ICommunityCommentVote> {
  const prepared: ICommunityCommentVote.ICreate =
    prepare_random_community_comment_vote(props.body);
  const result: ICommunityCommentVote =
    await api.functional.community.member.comments.vote(connection, {
      commentId: props.params.commentId,
      body: prepared,
    });
  return result;
}
