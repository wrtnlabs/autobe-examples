import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random community hub community creation data for E2E testing.
 *
 * Generates a complete ICommunityHubCommunity.ICreate with randomized values
 * suitable for testing community creation, duplicate name detection, browsing,
 * and subscription scenarios.
 *
 * The name is a random 2-3 word human-readable string, the description is a
 * brief 2-sentence paragraph, and the icon_image is a randomly generated valid
 * URI. All values can be overridden via the optional DeepPartial input parameter.
 */
export function prepare_random_community_hub_community(
  input?: DeepPartial<ICommunityHubCommunity.ICreate>,
): ICommunityHubCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    icon_image:
      input?.icon_image ?? typia.random<string & tags.Format<"uri">>(),
  };
}
