import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit clone community moderator creation data for E2E testing.
 *
 * Generates a complete IRedditCloneCommunityModerator.ICreate with randomized values.
 * The userProfileId references a user profile to assign moderator privileges,
 * and the role determines the level of authority ('owner' or 'moderator').
 *
 * @param input - Optional partial input to override specific fields
 * @returns Complete IRedditCloneCommunityModerator.ICreate instance
 */
export function prepare_random_reddit_clone_community_moderator(
  input?: DeepPartial<IRedditCloneCommunityModerator.ICreate>,
): IRedditCloneCommunityModerator.ICreate {
  return {
    userProfileId:
      input?.userProfileId ?? typia.random<string & tags.Format<"uuid">>(),
    role: input?.role ?? RandomGenerator.pick(["owner", "moderator"] as const),
  };
}
