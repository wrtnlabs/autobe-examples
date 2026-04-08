import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random Reddit community creation data for E2E testing.
 *
 * Generates a complete IRedditCommunityCommunity.ICreate with randomized values for community name, description, and icon URI. All properties support test-time customization through the optional input parameter.
 *
 * The generated data conforms to backend validation constraints: name must be unique across communities, description provides context for subscribers, and icon must be a valid URI pointing to a hosted image.
 *
 * @param input Optional partial input for test-time customization of community properties
 * @returns Complete IRedditCommunityCommunity.ICreate object with all required fields populated
 */
export function prepare_random_reddit_community_community(
  input?: DeepPartial<IRedditCommunityCommunity.ICreate>,
): IRedditCommunityCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ sentences: 2 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    icon: input?.icon ?? typia.random<string & tags.Format<"uri">>(),
  };
}
