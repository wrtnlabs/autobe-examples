import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_vote_of_moderator } from "../prepare/prepare_random_community_platform_post_vote_of_moderator";

export async function generate_random_community_platform_moderator_post_votes_moderators_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformPostVoteOfModerator.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformPostVoteOfModerator> {
  const prepared: ICommunityPlatformPostVoteOfModerator.ICreate =
    prepare_random_community_platform_post_vote_of_moderator(props.body);
  const result: ICommunityPlatformPostVoteOfModerator =
    await api.functional.communityPlatform.moderator.postVotes.moderators.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
