import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommentVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_vote_of_moderator } from "../prepare/prepare_random_community_platform_comment_vote_of_moderator";

export async function generate_random_community_platform_moderator_comment_votes_moderators_create_moderator_comment_vote(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommentVoteOfModerator.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformCommentVoteOfModerator> {
  const prepared: ICommunityPlatformCommentVoteOfModerator.ICreate =
    prepare_random_community_platform_comment_vote_of_moderator(props.body);
  const result: ICommunityPlatformCommentVoteOfModerator =
    await api.functional.communityPlatform.moderator.commentVotes.moderators.createModeratorCommentVote(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
