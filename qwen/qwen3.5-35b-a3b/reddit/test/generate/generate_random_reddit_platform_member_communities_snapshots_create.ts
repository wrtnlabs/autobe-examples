import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_community_snapshot } from "../prepare/prepare_random_reddit_platform_community_snapshot";

/**
 * Generate a random audit snapshot of a community for E2E testing.
 *
 * Prepares random snapshot data using the prepare function, then calls the
 * creation endpoint with the specified community name. The snapshot captures
 * point-in-time data of the community's state for historical tracking and
 * audit trail purposes.
 *
 * @param connection - API connection with authentication
 * @param props.body - Optional partial snapshot data to override defaults
 * @param props.params.name - Unique name of the community to create snapshot for
 * @returns Created community snapshot with ID and timestamp
 */
export async function generate_random_reddit_platform_member_communities_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformCommunitySnapshot.ICreate> | undefined;
    params: {
      name: string;
    };
  },
): Promise<IRedditPlatformCommunitySnapshot> {
  const prepared: IRedditPlatformCommunitySnapshot.ICreate =
    prepare_random_reddit_platform_community_snapshot(props.body);
  const result: IRedditPlatformCommunitySnapshot =
    await api.functional.redditPlatform.member.communities.snapshots.create(
      connection,
      {
        name: props.params.name,
        body: prepared,
      },
    );
  return result;
}
