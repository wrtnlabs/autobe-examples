import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community moderator creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityModerator.ICreate with randomized values for adding a moderator to a community. The memberId references an existing member account, and role determines their authority level (owner or moderator).
 *
 * Both properties are test-customizable through the DeepPartial input parameter. The memberId uses UUID format for database reference integrity, while role is randomly selected between 'owner' and 'moderator' to represent different authority levels.
 */
export function prepare_random_reddit_community_moderator(
  input?: DeepPartial<IRedditCommunityModerator.ICreate>,
): IRedditCommunityModerator.ICreate {
  return {
    memberId: input?.memberId ?? typia.random<string & tags.Format<"uuid">>(),
    role: input?.role ?? RandomGenerator.pick(["owner", "moderator"] as const),
  };
}
