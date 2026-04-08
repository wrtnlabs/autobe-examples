import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit-like community creation data for E2E testing.
 *
 * Generates a complete IRedditLikeCommunity.ICreate with randomized values. The name field is required and will always be populated with a human-readable community name. The description and icon_url fields are optional and may be null.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IRedditLikeCommunity.ICreate object with all required fields populated
 */
export function prepare_random_reddit_like_community(
  input?: DeepPartial<IRedditLikeCommunity.ICreate>,
): IRedditLikeCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: input?.icon_url ?? null,
  };
}
