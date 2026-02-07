import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_name_search(
  connection: api.IConnection,
): Promise<void> {
  // Generate search term for community names
  const searchTerm = RandomGenerator.name(2).toLowerCase();
  // Perform community search
  const result = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        name: searchTerm,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Validate search results contain at least one community
  TestValidator.predicate("should have search results", result.data.length > 0);
  // Verify the search results contain community names that match the search term
  const matchingResults = result.data.filter((community) =>
    community.name.toLowerCase().includes(searchTerm),
  );
  TestValidator.equals(
    "should have matching community results",
    matchingResults.length,
    result.data.length,
  );
  // Verify community fields are present and valid
  for (const community of result.data) {
    TestValidator.predicate(
      "community ID should be valid",
      community.id !== "",
    );
    TestValidator.predicate(
      "community name should not be empty",
      community.name !== "",
    );
    TestValidator.predicate(
      "community owner should not be empty",
      community.owner != null && Object.keys(community.owner).length > 0,
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be > 0",
    result.pagination.records > 0,
  );
  TestValidator.predicate("pages should be >= 1", result.pagination.pages >= 1);
}
