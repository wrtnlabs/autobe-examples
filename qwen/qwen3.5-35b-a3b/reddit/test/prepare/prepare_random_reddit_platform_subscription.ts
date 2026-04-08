import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform subscription creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformSubscription.ICreate with randomized
 * values. The community_id field is a UUID string that references a valid,
 * non-deleted community in the platform.
 */
export function prepare_random_reddit_platform_subscription(
  input?: DeepPartial<IRedditPlatformSubscription.ICreate>,
): IRedditPlatformSubscription.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
