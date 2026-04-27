import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderator } from "../prepare/prepare_random_community_platform_moderator";

/**
 * Generate a random community platform moderator appointment via the API for E2E testing.
 *
 * Prepares random moderator appointment data using the prepare function, then calls the moderator
 * appointment creation endpoint. The requesting member must already hold a moderation role (owner
 * or moderator) in the target community to perform this operation.
 *
 * The generated request specifies the target community by its unique name and the member to appoint
 * as moderator by their unique username. The server resolves both values to internal UUID
 * identifiers and returns the created moderator record with the assigned 'moderator' role.
 *
 * @param connection - The API connection configuration including host and authentication headers
 * @param props.body - Optional partial overrides for the moderator appointment input data
 * @returns The created moderator appointment record with role set to 'moderator'
 */
export async function generate_random_community_platform_member_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerator.ICreate>;
  },
): Promise<ICommunityPlatformModerator> {
  const prepared: ICommunityPlatformModerator.ICreate =
    prepare_random_community_platform_moderator(props.body);
  return await api.functional.communityPlatform.member.moderators.create(
    connection,
    {
      body: prepared,
    },
  );
}
