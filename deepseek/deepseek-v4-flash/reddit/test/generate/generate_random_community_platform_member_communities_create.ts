import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community } from "../prepare/prepare_random_community_platform_community";

/**
 * Generate a random community platform community via the API for E2E testing.
 *
 * Prepares random community creation data using the prepare function, then
 * calls the community creation endpoint to create the actual community. The
 * generated community will have a unique name, descriptive text, and icon
 * images as determined by the prepare function.
 *
 * @param connection The API connection configuration
 * @param props Optional input to override specific generated community fields
 * @returns The created community entity with system-generated fields
 */
export async function generate_random_community_platform_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunity.ICreate> | undefined;
  }
): Promise<ICommunityPlatformCommunity> {
  const prepared: ICommunityPlatformCommunity.ICreate = prepare_random_community_platform_community(
    props.body
  );
  return await api.functional.communityPlatform.member.communities.create(
    connection,
    {
      body: prepared,
    },
  );
}