import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random reddit community subscription creation data for E2E testing.
 *
 * Generates a complete IRedditCommunitySubscription.ICreate with randomized values.
 * The input parameter allows partial customization of the data while providing
 * sensible defaults for all fields.
 */
export function prepare_random_reddit_community_subscription(
  input?: DeepPartial<IRedditCommunitySubscription.ICreate>,
): IRedditCommunitySubscription.ICreate {
  return {
    reddit_community_communities_id:
      input?.reddit_community_communities_id ??
      (typia.random<string>() as string & tags.Format<"uuid">),
  };
}