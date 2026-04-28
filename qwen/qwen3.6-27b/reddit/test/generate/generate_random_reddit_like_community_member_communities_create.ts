import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_community } from "../prepare/prepare_random_reddit_like_community_community";

/**
 * Generate a random Reddit-like community for E2E testing.
 *
 * Prepares random community data using the prepare function, then calls the creation endpoint.
 * The authenticated user automatically becomes the creator and highest authority owner of the new community.
 */
export async function generate_random_reddit_like_community_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IREdditLikeCommunityCommunity.ICreate> | undefined;
  },
): Promise<IREdditLikeCommunityCommunity> {
  const prepared: IREdditLikeCommunityCommunity.ICreate =
    prepare_random_reddit_like_community_community(props.body);
  const result: IREdditLikeCommunityCommunity =
    await api.functional.redditLikeCommunity.member.communities.create(
      connection,
      { body: prepared },
    );
  return result;
}
