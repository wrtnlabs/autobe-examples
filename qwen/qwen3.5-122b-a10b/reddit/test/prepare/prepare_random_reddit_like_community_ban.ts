import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community ban creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunityBan.ICreate with randomized values.
 * The function accepts optional input overrides via DeepPartial for test customization.
 *
 * ## Generated Properties
 *
 * - `member_id`: Random UUID v4 string representing the member to ban
 *
 * ## Usage Example
 *
 * ```typescript
 * // Generate completely random ban data
 * const banData = prepare_random_reddit_like_community_ban();
 *
 * // Override specific properties
 * const customBan = prepare_random_reddit_like_community_ban({
 *   member_id: "550e8400-e29b-41d4-a716-446655440000",
 * });
 * ```
 */
export function prepare_random_reddit_like_community_ban(
  input?: DeepPartial<IRedditLikeCommunityBan.ICreate>,
): IRedditLikeCommunityBan.ICreate {
  return {
    member_id: input?.member_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
