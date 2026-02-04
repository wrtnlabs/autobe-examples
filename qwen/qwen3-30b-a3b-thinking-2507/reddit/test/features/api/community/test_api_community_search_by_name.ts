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

export async function test_api_community_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Search for 'dev' - should return communities with names containing 'dev' case-insensitively
  const searchResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        name: "dev",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResults);
  // Verify matching communities contain 'dev' in name (case-insensitive)
  const matchingCommunities = searchResults.data.filter((community) =>
    community.name.toLowerCase().includes("dev"),
  );
  // At least one community should match the search
  TestValidator.equals(
    "found at least one community",
    matchingCommunities.length > 0,
    true,
  );
  // Validate all matching communities have at least 10 subscribers
  matchingCommunities.forEach((community) => {
    TestValidator.predicate(
      `community "${community.name}" has sufficient subscribers (${community.subscriber_count})`,
      community.subscriber_count >= 10,
    );
  });
}
