import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community platform moderator appointment data for E2E testing.
 *
 * Generates a complete ICommunityPlatformModerator.ICreate with randomized values
 * for the community name and member username. Both properties serve as lookup
 * keys that resolve to internal UUID identifiers on the server side.
 *
 * The community name identifies the target community where the moderator role
 * will be granted. The member username identifies the user being appointed as
 * a moderator. The authenticated caller must already hold a moderation role
 * (owner or moderator) in the target community to perform this operation.
 *
 * @param input - Partial override for specific properties during testing
 * @returns A complete ICommunityPlatformModerator.ICreate with all properties populated
 */
export function prepare_random_community_platform_moderator(
  input?: DeepPartial<ICommunityPlatformModerator.ICreate>,
): ICommunityPlatformModerator.ICreate {
  return {
    communityName: input?.communityName ?? RandomGenerator.name(2),
    memberUsername: input?.memberUsername ?? RandomGenerator.alphabets(10),
  };
}
