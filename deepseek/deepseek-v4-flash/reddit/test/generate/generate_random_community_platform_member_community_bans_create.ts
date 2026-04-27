import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_ban } from "../prepare/prepare_random_community_platform_community_ban";

/**
 * Generate a random community platform community ban for E2E testing.
 *
 * Prepares random ban creation data using the prepare function, then calls the
 * ban creation endpoint. The created ban record includes the community, banned
 * member, banning moderator, reason, and timestamps.
 *
 * @param connection The API connection to use for the request
 * @param props.body Optional partial input to override specific generated ban data
 * @returns The created community platform community ban record
 */
export async function generate_random_community_platform_member_community_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityBan.ICreate> | undefined;
  }
): Promise<ICommunityPlatformCommunityBan> {
  const prepared: ICommunityPlatformCommunityBan.ICreate = prepare_random_community_platform_community_ban(
    props.body
  );
  return await api.functional.communityPlatform.member.community_bans.create(
    connection,
    {
      body: prepared,
    },
  );
}