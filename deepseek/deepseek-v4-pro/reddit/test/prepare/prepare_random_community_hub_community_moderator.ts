import { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community hub community moderator creation data for E2E testing.
 *
 * Generates a complete ICommunityHubCommunityModerator.ICreate with a randomized
 * username. The username is an alphanumeric string that simulates a unique member
 * identifier within the system.
 *
 * Callers can override the username via the input parameter to specify a particular
 * member for moderator assignment in test scenarios.
 */
export function prepare_random_community_hub_community_moderator(
  input?: DeepPartial<ICommunityHubCommunityModerator.ICreate>,
): ICommunityHubCommunityModerator.ICreate {
  return {
    username: input?.username ?? RandomGenerator.alphaNumeric(8),
  };
}
