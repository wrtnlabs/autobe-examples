import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community subscription creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunitySubscription.ICreate with randomized values.
 * The function accepts optional partial input to override specific properties while
 * auto-generating the remaining fields with realistic test data.
 *
 * @param input - Optional partial input to customize specific properties
 * @returns Complete IRedditLikeCommunitySubscription.ICreate object
 */
export function prepare_random_reddit_like_community_subscription(
  input?: DeepPartial<IRedditLikeCommunitySubscription.ICreate>,
): IRedditLikeCommunitySubscription.ICreate {
  return {
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
