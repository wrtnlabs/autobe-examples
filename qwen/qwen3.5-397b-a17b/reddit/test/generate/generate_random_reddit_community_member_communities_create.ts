import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_community } from "../prepare/prepare_random_reddit_community_community";

/**
 * Generate a random Reddit community via the API for E2E testing.
 *
 * Prepares random community data using the prepare function, then calls the community creation endpoint. The created community includes auto-generated id, owner information from the authenticated member session, and timestamps.
 *
 * The community name is randomized to ensure uniqueness across test runs. Description and icon are also generated with random values conforming to backend validation constraints.
 *
 * @param connection API connection information with authentication headers
 * @param props Optional props containing partial community creation data for customization
 * @returns The newly created IRedditCommunityCommunity object with all fields populated
 */
export async function generate_random_reddit_community_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityCommunity.ICreate>;
  },
): Promise<IRedditCommunityCommunity> {
  const prepared: IRedditCommunityCommunity.ICreate =
    prepare_random_reddit_community_community(props.body);
  const result: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
