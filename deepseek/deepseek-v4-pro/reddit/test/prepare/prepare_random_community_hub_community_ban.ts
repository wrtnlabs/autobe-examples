import { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community hub community ban creation data for E2E testing.
 *
 * Generates a complete ICommunityHubCommunityBan.ICreate with randomized values
 * suitable for testing community moderation ban operations. The username is
 * generated as a single-word name-like string, and the reason is a short
 * paragraph explaining the ban.
 */
export function prepare_random_community_hub_community_ban(
  input?: DeepPartial<ICommunityHubCommunityBan.ICreate> | undefined,
): ICommunityHubCommunityBan.ICreate {
  return {
    username: input?.username ?? RandomGenerator.name(1),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
