import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_moderator } from "../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Generate a random community moderator assignment via the API for E2E testing.
 *
 * Prepares random moderator creation data using the prepare function, then calls the creation endpoint to appoint a member as a moderator in the specified community.
 *
 * @param connection The API connection object
 * @param props.body Optional partial input to override specific properties in the moderator creation data
 * @param props.params.communityId UUID identifier of the community to add a moderator to
 * @returns The created moderator assignment record with id, community, member, and timestamps
 */
export async function generate_random_reddit_like_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityModerator.ICreate>;
    params?: {
      communityId: string;
    };
  },
): Promise<IRedditLikeCommunityModerator> {
  const prepared: IRedditLikeCommunityModerator.ICreate =
    prepare_random_reddit_like_community_moderator(props.body);
  const result: IRedditLikeCommunityModerator =
    await api.functional.redditLike.member.communities.moderators.create(
      connection,
      {
        communityId: props.params?.communityId!,
        body: prepared,
      },
    );
  return result;
}
