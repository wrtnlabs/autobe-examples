import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit platform community creation data for E2E testing.
 *
 * Generates a complete IRedditPlatformCommunity.ICreate with randomized values.
 * The name field follows strict pattern matching for alphanumeric characters
 * and underscores only. Both description and icon_url are nullable and optional,
 * following the database schema constraints.
 */
export function prepare_random_reddit_platform_community(
  input?: DeepPartial<IRedditPlatformCommunity.ICreate> | undefined,
): IRedditPlatformCommunity.ICreate {
  return {
    name:
      input?.name ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: input?.icon_url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
