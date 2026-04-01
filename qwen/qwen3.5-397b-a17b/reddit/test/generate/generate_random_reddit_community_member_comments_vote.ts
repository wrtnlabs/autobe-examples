import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_comment_vote } from "../prepare/prepare_random_reddit_community_comment_vote";

export async function generate_random_reddit_community_member_comments_vote(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommentVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<IRedditCommunityComment.ISummary> {
  const prepared: IRedditCommunityCommentVote.ICreate =
    prepare_random_reddit_community_comment_vote(props.body);
  const result: IRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.member.comments.vote(connection, {
      commentId: props.params.commentId,
      body: prepared,
    });
  return result;
}
