import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community } from "../prepare/prepare_random_reddit_platform_community";

/**
 * Generate a random community on the Reddit-like platform for E2E testing.
 *
 * Prepares random community data using the prepare function, then calls the
 * creation endpoint to create an actual community via the API. The community
 * name follows strict pattern matching for alphanumeric characters and
 * underscores only. Both description and icon_url are nullable and optional,
 * following the database schema constraints.
 */
export async function generate_random_reddit_platform_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommunity.ICreate> | undefined;
  },
): Promise<IRedditPlatformCommunity> {
  const prepared: IRedditPlatformCommunity.ICreate =
    prepare_random_reddit_platform_community(props.body);
  const result: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
