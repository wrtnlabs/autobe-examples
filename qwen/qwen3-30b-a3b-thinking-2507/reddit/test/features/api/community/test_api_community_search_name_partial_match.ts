import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Perform community search with 'dev' name parameter
  const searchResult =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      {
        body: {
          name: "dev",
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(searchResult);
  // Step 2: Verify search results exist with descriptive validation
  TestValidator.equals(
    'Community search with "dev" must return results',
    searchResult.data.length > 0,
    true,
  );
  // Step 3: Verify all returned community names contain 'dev' (case-insensitively) with business context
  for (const community of searchResult.data) {
    TestValidator.equals(
      `Community '${community.name}' name should contain 'dev' to validate partial matching`,
      community.name.toLowerCase().includes("dev"),
      true,
    );
  }
}
