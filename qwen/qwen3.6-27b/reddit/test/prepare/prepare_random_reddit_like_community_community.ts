import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community creation data for E2E testing.
 *
 * Generates a complete `IREdditLikeCommunityCommunity.ICreate` instance
 * with randomized values for name, description, and optional icon URI.
 *
 * - `name`: Community name (human-readable).
 * - `description`: Community description (paragraph text).
 * - `icon_uri`: Optional valid URI string.
 */
export function prepare_random_reddit_like_community_community(
  input?: DeepPartial<IREdditLikeCommunityCommunity.ICreate> | undefined,
): IREdditLikeCommunityCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 4 }),
    icon_uri: input!.icon_uri ?? typia.random<string & tags.Format<"uri">>(),
  };
}
