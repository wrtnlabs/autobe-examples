import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community subscription creation data for E2E testing.
 *
 * Generates a complete IRedditCommunitySubscription.ICreate with randomized values.
 * The community_id is generated as a valid UUID format string representing the
 * target community that the authenticated member wants to subscribe to.
 *
 * This function supports partial input overrides via DeepPartial, allowing tests
 * to customize specific properties while auto-generating the rest.
 */
export function prepare_random_reddit_community_subscription(
  input?: DeepPartial<IRedditCommunitySubscription.ICreate>,
): IRedditCommunitySubscription.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
