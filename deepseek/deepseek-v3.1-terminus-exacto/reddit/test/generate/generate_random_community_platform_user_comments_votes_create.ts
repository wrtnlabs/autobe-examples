import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_vote } from "../prepare/prepare_random_community_platform_comment_vote";

export async function generate_random_community_platform_user_comments_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentVote.ICreate>;
    params: {
      commentId: string;
    };
  },
): Promise<ICommunityPlatformCommentVote> {
  const prepared: ICommunityPlatformCommentVote.ICreate =
    prepare_random_community_platform_comment_vote(props.body);
  const result: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.user.comments.votes.create(
      connection,
      {
        body: prepared,
        commentId: props.params.commentId,
      },
    );
  return result;
}
