import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve all communities to establish baseline data
  const allCommunitiesResponse =
    await api.functional.redditLike.communities.index(connection, { body: {} });
  typia.assert(allCommunitiesResponse);
  const totalCommunities = allCommunitiesResponse.data;
  // Skip test if no communities exist (empty dataset)
  if (totalCommunities.length === 0) {
    return;
  }
  // Sample a community name to extract partial search term
  const sampleCommunity = RandomGenerator.pick(totalCommunities);
  const originalName = sampleCommunity.name;
  // Extract a partial substring (at least 2 characters, or full name if shorter)
  const searchTermLength = Math.max(2, Math.floor(originalName.length / 2));
  const searchTerm = originalName
    .substring(0, Math.min(searchTermLength, originalName.length))
    .toLowerCase();
  // Perform case-insensitive partial search
  const searchResponse = await api.functional.redditLike.communities.index(
    connection,
    { body: { search: searchTerm } },
  );
  typia.assert(searchResponse);
  // Verify all returned communities match the search term case-insensitively
  for (const community of searchResponse.data) {
    const communityNameLower = community.name.toLowerCase();
    TestValidator.predicate(
      "search result contains search term",
      communityNameLower.includes(searchTerm),
    );
  }
  // Verify subscriber count is non-negative (accurate calculation cannot be verified without database access)
  for (const community of searchResponse.data) {
    TestValidator.predicate(
      "subscriberCount is non-negative",
      community.subscriberCount >= 0,
    );
  }
  // Test sorting by subscriber_count
  const sortBySubscribers = await api.functional.redditLike.communities.index(
    connection,
    { body: { sort: "subscriber_count", limit: 5 } },
  );
  typia.assert(sortBySubscribers);
  // Verify subscriber_count descending order
  for (let i = 1; i < sortBySubscribers.data.length; i++) {
    const prev = sortBySubscribers.data[i - 1];
    const curr = sortBySubscribers.data[i];
    TestValidator.predicate(
      "subscriber_count sorted descending",
      prev.subscriberCount >= curr.subscriberCount,
    );
  }
  // Test sorting by name (alphabetical)
  const sortByName = await api.functional.redditLike.communities.index(
    connection,
    { body: { sort: "name", limit: 5 } },
  );
  typia.assert(sortByName);
  // Verify names sorted alphabetically
  for (let i = 1; i < sortByName.data.length; i++) {
    const prev = sortByName.data[i - 1];
    const curr = sortByName.data[i];
    TestValidator.predicate(
      "name sorted alphabetically",
      prev.name.localeCompare(curr.name) <= 0,
    );
  }
  // Test pagination with search filter using a fixed limit
  const pageSize = 5;
  const searchPageResponse = await api.functional.redditLike.communities.index(
    connection,
    { body: { search: searchTerm, page: 1, limit: pageSize } },
  );
  typia.assert(searchPageResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchPageResponse.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination total records >= 0",
    searchPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchPageResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length <= limit",
    searchPageResponse.data.length <= pageSize,
  );
  // Test second page if there are more records than pageSize
  if (searchPageResponse.pagination.records > pageSize) {
    const secondPage = await api.functional.redditLike.communities.index(
      connection,
      { body: { search: searchTerm, page: 2, limit: pageSize } },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
  }
  // Test search with non-matching term returns empty results
  const nonMatchingSearch = "xyznonexistent12345";
  const emptySearchResponse = await api.functional.redditLike.communities.index(
    connection,
    { body: { search: nonMatchingSearch } },
  );
  typia.assert(emptySearchResponse);
  // Results should be empty or contain only names matching the non-matching term (which should be none)
  TestValidator.equals(
    "non-matching search returns empty results",
    emptySearchResponse.data.length,
    0,
  );
}
