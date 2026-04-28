import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community subscription creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunityCommunitySubscription.ICreate with a random UUID
 * for the community_id field, representing the community a member wants to subscribe to.
 * The member identity is resolved automatically from the authentication session.
 */
export function prepare_random_reddit_like_community_community_subscription(
  input?: DeepPartial<IRedditLikeCommunityCommunitySubscription.ICreate>,
): IRedditLikeCommunityCommunitySubscription.ICreate {
  return {
    community_id:
      input?.community_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
