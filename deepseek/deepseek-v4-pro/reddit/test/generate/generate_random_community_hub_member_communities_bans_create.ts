import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_hub_community_ban } from "../prepare/prepare_random_community_hub_community_ban";

/**
 * Generate a random community ban via the API for E2E testing.
 *
 * Prepares random ban data using the prepare function, then calls the ban creation
 * endpoint. The target community is specified by its unique name, and the member
 * to ban is identified by username in the request body.
 *
 * Requires the authenticated connection to have moderator or owner privileges
 * in the target community. If the member is already actively banned, the existing
 * ban record is returned without error.
 */
export async function generate_random_community_hub_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubCommunityBan.ICreate> | undefined;
    params: {
      communityName: string;
    };
  },
): Promise<ICommunityHubCommunityBan> {
  const prepared: ICommunityHubCommunityBan.ICreate =
    prepare_random_community_hub_community_ban(props.body);
  const result: ICommunityHubCommunityBan =
    await api.functional.communityHub.member.communities.bans.create(
      connection,
      {
        communityName: props.params.communityName,
        body: prepared,
      },
    );
  return result;
}
