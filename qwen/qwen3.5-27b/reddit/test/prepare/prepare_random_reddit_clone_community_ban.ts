import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone community ban creation data for E2E testing.
 *
 * Generates a complete IRedditCloneCommunityBan.ICreate with randomized values
 * for banning a member from a community. The ban reason provides transparency
 * for moderation actions, and the optional expiration time supports temporary bans.
 *
 * **Generated Fields**:
 * - `ban_reason`: Human-readable explanation for the ban (3 sentences)
 * - `reddit_clone_member_id`: Random UUID of the member to ban
 * - `expires_at`: Optional future date-time for temporary bans
 */
export function prepare_random_reddit_clone_community_ban(
  input?: DeepPartial<IRedditCloneCommunityBan.ICreate>,
): IRedditCloneCommunityBan.ICreate {
  return {
    ban_reason:
      input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 3 }),
    reddit_clone_member_id:
      input?.reddit_clone_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    expires_at:
      input?.expires_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
