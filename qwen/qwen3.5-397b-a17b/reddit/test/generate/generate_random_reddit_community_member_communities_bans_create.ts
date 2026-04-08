import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_ban } from "../prepare/prepare_random_reddit_community_ban";

/**
 * Generate a random Reddit community ban via the API for E2E testing.
 *
 * Prepares random ban data using the prepare function, then calls the creation endpoint to create a ban record that restricts a member's posting privileges in the specified community. The ban is scoped to a single community and does not affect the member's ability to participate in other communities.
 *
 * The function generates realistic ban data including a valid UUID for the member identifier, a descriptive reason for the ban, and a status value from the allowed set ('active' or 'removed'). The issuer is automatically tracked from the authenticated session.
 *
 * @param connection - API connection information for the test scenario
 * @param props - Generation options including optional body customization and required community ID
 * @param props.body - Optional partial ban creation data to override random generation
 * @param props.params - URL path parameters for the API endpoint
 * @param props.params.communityId - Unique identifier of the community where the ban applies
 * @returns Promise resolving to the created ban record with all fields including timestamps
 */
export async function generate_random_reddit_community_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityBan.ICreate>;
    params?: {
      communityId: string;
    };
  },
): Promise<IRedditCommunityBan> {
  const prepared: IRedditCommunityBan.ICreate =
    prepare_random_reddit_community_ban(props.body);
  const result: IRedditCommunityBan =
    await api.functional.redditCommunity.member.communities.bans.create(
      connection,
      {
        communityId: props.params?.communityId ?? "",
        body: prepared,
      },
    );
  return result;
}
