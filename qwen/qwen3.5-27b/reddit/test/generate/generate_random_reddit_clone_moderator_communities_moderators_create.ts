import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_community_moderator } from "../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Generate a random moderator assignment for a community via the API for E2E testing.
 *
 * Prepares random moderator assignment data using the prepare function, then calls the creation endpoint to add a moderator to the specified community. The function requires a communityId parameter to identify which community the moderator will be assigned to.
 *
 * The moderator assignment includes a user profile ID and role (owner or moderator), granting the user elevated permissions within that community including content deletion, user banning, and report handling.
 */
export async function generate_random_reddit_clone_moderator_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneCommunityModerator.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditCloneCommunityModerator> {
  const prepared: IRedditCloneCommunityModerator.ICreate =
    prepare_random_reddit_clone_community_moderator(props.body);
  const result: IRedditCloneCommunityModerator =
    await api.functional.redditClone.moderator.communities.moderators.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
