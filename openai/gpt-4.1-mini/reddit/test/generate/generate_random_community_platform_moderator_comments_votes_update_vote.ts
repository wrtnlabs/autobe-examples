import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_vote_of_users } from "../prepare/prepare_random_community_platform_comment_vote_of_users";

export async function generate_random_community_platform_moderator_comments_votes_update_vote(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommentVoteOfUsers.ICreate>
      | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<ICommunityPlatformCommentVoteOfUsers> {
  const prepared: ICommunityPlatformCommentVoteOfUsers.ICreate =
    prepare_random_community_platform_comment_vote_of_users(props.body);
  const result: ICommunityPlatformCommentVoteOfUsers =
    await api.functional.communityPlatform.moderator.comments.votes.updateVote(
      connection,
      {
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
