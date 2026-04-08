import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform community snapshot creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformCommunitySnapshot.ICreate with randomized
 * values for community snapshot capture. ...
 */
export function prepare_random_reddit_platform_community_snapshot(
  input?: DeepPartial<IRedditPlatformCommunitySnapshot.ICreate> | undefined,
): IRedditPlatformCommunitySnapshot.ICreate {
  return {
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: input?.icon_url ?? RandomGenerator.alphabets(16),
    name: input?.name ?? RandomGenerator.name(),
  };
}
