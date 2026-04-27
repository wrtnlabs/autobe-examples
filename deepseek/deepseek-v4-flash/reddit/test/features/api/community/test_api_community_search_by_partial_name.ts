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

export async function test_api_community_search_by_partial_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First fetch all communities to obtain a searchable substring
  const allCommunities =
    await api.functional.communityPlatform.communities.search(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(allCommunities);
  // Step 2: Pick a substring from an existing community name for search validation
  const searchSubstring: string =
    allCommunities.data.length > 0 && allCommunities.data[0].name.length > 0
      ? allCommunities.data[0].name.substring(
          0,
          Math.min(3, allCommunities.data[0].name.length),
        )
      : "a";
  // Step 3: Search communities using the partial name substring
  const output: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search(connection, {
      body: {
        search: searchSubstring,
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(output);
  // Step 4: Validate each community in search results for business logic
  for (const community of output.data) {
    // Verify case-insensitive substring match
    TestValidator.predicate(
      `community name "${community.name}" contains search "${searchSubstring}"`,
      community.name.toLowerCase().includes(searchSubstring.toLowerCase()),
    );
    // Verify subscriber_count is non-negative (business rule)
    TestValidator.predicate(
      `subscriber_count for ${community.name} is non-negative`,
      community.subscriber_count >= 0,
    );
  }
  // Step 5: Verify sorting by created_at DESC (newest communities first)
  for (let i: number = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      `results sorted by created_at DESC at index ${i}`,
      new Date(output.data[i - 1].created_at).getTime() >=
        new Date(output.data[i].created_at).getTime(),
    );
  }
}
