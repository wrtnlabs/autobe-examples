import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone community subscription creation data for E2E testing.
 *
 * Generates a complete IRedditCloneCommunitySubscription.ICreate with randomized values.
 * This function creates subscription data that links an authenticated member to a community,
 * granting the member the ability to create posts within the subscribed community.
 *
 * The community_id is generated as a valid UUID by default, but can be overridden
 * through the input parameter for specific test scenarios.
 */
export function prepare_random_reddit_clone_community_subscription(
  input?: DeepPartial<IRedditCloneCommunitySubscription.ICreate> | undefined,
): IRedditCloneCommunitySubscription.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
