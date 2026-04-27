import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_ban } from "../prepare/prepare_random_community_platform_ban";

/**
 * Generate a random community platform member communities bans creation via the API for E2E testing.
 *
 * Prepares random ban data using the prepare function, then calls the creation
 * endpoint to ban a member from a specific community. The generated ban record
 * links a banned member to a community, with a reason provided by the banning
 * moderator.
 *
 * The generated function accepts an optional DeepPartial input allowing test
 * authors to override specific ban properties (member_id and reason) while
 * defaulting to randomly generated values for unspecified fields.
 *
 * @param connection The API connection object
 * @param props.body Optional partial data to customize the ban creation
 * @param props.params Community name path parameter identifying the target community
 * @returns The newly created ICommunityPlatformBan record
 */
export async function generate_random_community_platform_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformBan.ICreate> | undefined;
    params: {
      communityName: string;
    };
  },
): Promise<ICommunityPlatformBan> {
  const prepared: ICommunityPlatformBan.ICreate =
    prepare_random_community_platform_ban(props.body);
  const result: ICommunityPlatformBan =
    await api.functional.communityPlatform.member.communities.bans.create(
      connection,
      {
        communityName: props.params.communityName,
        body: prepared,
      },
    );
  return result;
}
