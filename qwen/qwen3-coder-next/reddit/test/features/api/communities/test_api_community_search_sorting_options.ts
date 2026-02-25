import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community search with sorting options:
 * 1. Search communities sorted by popularity (subscriber count DESC)
 * 2. Search communities sorted by newness (creation date DESC)
 * 3. Search communities sorted by subscriber count
 * 4. Verify sorting is correctly applied to results
 * 5. Test combination of search term with sorting options
 */
export async function test_api_community_search_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare request with different sorting options
  const searchPopular: IRedditCloneCommunity.IRequest = {
    sort: "popularity",
    limit: 100,
  };
  const searchNewness: IRedditCloneCommunity.IRequest = {
    sort: "newness",
    limit: 100,
  };
  const searchSubscriberCount: IRedditCloneCommunity.IRequest = {
    sort: "subscriberCount",
    limit: 100,
  };
  const searchCombined: IRedditCloneCommunity.IRequest = {
    search: "test",
    sort: "subscriberCount",
    limit: 100,
  };
  // 2. Test sorting by popularity (subscriber count DESC)
  const popularityResult: IPageIRedditCloneCommunity.ISummary =
    await api.functional.redditClone.communities.index(connection, {
      body: searchPopular,
    });
  typia.assert(popularityResult);
  // Verify popularity sorting: subscriber counts should be in descending order
  for (let i = 0; i < popularityResult.data.length - 1; i++) {
    TestValidator.predicate(
      "popularity sorting",
      popularityResult.data[i].subscriberCount >=
        popularityResult.data[i + 1].subscriberCount,
    );
  }
  // 3. Test sorting by newness (creation date DESC)
  const newnessResult: IPageIRedditCloneCommunity.ISummary =
    await api.functional.redditClone.communities.index(connection, {
      body: searchNewness,
    });
  typia.assert(newnessResult);
  // Verify newness sorting: creation dates should be in descending order
  for (let i = 0; i < newnessResult.data.length - 1; i++) {
    TestValidator.predicate(
      "newness sorting",
      newnessResult.data[i].createdAt >= newnessResult.data[i + 1].createdAt,
    );
  }
  // 4. Test sorting by subscriber count
  const subscriberCountResult: IPageIRedditCloneCommunity.ISummary =
    await api.functional.redditClone.communities.index(connection, {
      body: searchSubscriberCount,
    });
  typia.assert(subscriberCountResult);
  // Verify subscriber count sorting: should be in descending order
  for (let i = 0; i < subscriberCountResult.data.length - 1; i++) {
    TestValidator.predicate(
      "subscriber count sorting",
      subscriberCountResult.data[i].subscriberCount >=
        subscriberCountResult.data[i + 1].subscriberCount,
    );
  }
  // 5. Test search term combined with sorting options
  const searchWithSortResult: IPageIRedditCloneCommunity.ISummary =
    await api.functional.redditClone.communities.index(connection, {
      body: searchCombined,
    });
  typia.assert(searchWithSortResult);
  // Verify search results contain expected term
  TestValidator.predicate(
    "search matches",
    searchWithSortResult.data.length > 0,
  );
  for (const community of searchWithSortResult.data) {
    const matchesSearch =
      community.name.toLowerCase().includes("test") ||
      (community.description?.toLowerCase().includes("test") ?? false);
    TestValidator.predicate("search term match", matchesSearch);
  }
}
