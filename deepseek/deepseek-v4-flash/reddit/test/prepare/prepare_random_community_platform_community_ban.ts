import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community ban creation data for E2E testing.
 *
 * Generates a complete ICommunityPlatformCommunityBan.ICreate with randomized
 * values for the community code, member code, and ban reason. All properties
 * can be overridden via the optional DeepPartial input.
 *
 * @param input Partial input to override specific generated values
 * @returns A complete ICommunityPlatformCommunityBan.ICreate with random data
 */
export function prepare_random_community_platform_community_ban(
  input?: DeepPartial<ICommunityPlatformCommunityBan.ICreate>,
): ICommunityPlatformCommunityBan.ICreate {
  return {
    communityCode: input?.communityCode ?? RandomGenerator.name(),
    memberCode: input?.memberCode ?? RandomGenerator.alphaNumeric(8),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
