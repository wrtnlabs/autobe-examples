import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community } from "../prepare/prepare_random_reddit_like_community";

/**
 * Generate a random Reddit-like community via the API for E2E testing.
 *
 * Prepares random community data using the prepare function, then calls the creation endpoint.
 * The authenticated member becomes the owner of the created community with full administrative authority.
 *
 * @param connection The HTTP connection to the API server
 * @param props Properties including optional partial community data to override defaults
 * @returns The newly created community entity with all fields including auto-generated id, owner_id, and timestamps
 */
export async function generate_random_reddit_like_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunity.ICreate>;
  },
): Promise<IRedditLikeCommunity> {
  const prepared: IRedditLikeCommunity.ICreate =
    prepare_random_reddit_like_community(props.body);
  const result: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
