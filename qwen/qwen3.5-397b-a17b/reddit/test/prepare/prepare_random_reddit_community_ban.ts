import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community ban creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityBan.ICreate with randomized values for
 * testing community ban creation endpoints. All properties support test-time
 * customization through the optional DeepPartial input parameter.
 *
 * The function generates realistic ban data including a valid UUID for the
 * member identifier, a descriptive reason for the ban, and a status value
 * from the allowed set ('active' or 'removed').
 */
export function prepare_random_reddit_community_ban(
  input?: DeepPartial<IRedditCommunityBan.ICreate>,
): IRedditCommunityBan.ICreate {
  return {
    reddit_community_member_id:
      input?.reddit_community_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    status:
      input?.status ?? RandomGenerator.pick(["active", "removed"] as const),
  };
}
