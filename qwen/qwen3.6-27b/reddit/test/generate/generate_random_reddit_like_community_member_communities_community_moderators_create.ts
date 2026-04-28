import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_moderator } from "../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Generate a random Reddit-like community moderator assignment for E2E testing.
 *
 * Prepares random moderator data using the prepare function, then calls the create endpoint
 * to appoint a member as the specified community.
 */
export async function generate_random_reddit_like_community_member_communities_community_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityModerator.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<IRedditLikeCommunityModerator> {
  const prepared: IRedditLikeCommunityModerator.ICreate =
    prepare_random_reddit_like_community_moderator(props.body);
  const result: IRedditLikeCommunityModerator =
    await api.functional.redditLikeCommunity.member.communities.community_moderators.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
