import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";

export async function test_api_community_list_pagination(
  connection: api.IConnection,
) {
  // Test 1: Retrieve first page, limit 5, no filters
  {
    const requestBody = {
      page: 1,
      limit: 5,
    } satisfies IRedditCommunityCommunity.IRequest;

    const response = await api.functional.redditCommunity.communities.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);

    TestValidator.predicate(
      "pagination current page is 1",
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit is 5",
      response.pagination.limit === 5,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is at least 1",
      response.pagination.pages >= 1,
    );

    for (const community of response.data) {
      typia.assert(community);
      TestValidator.predicate(
        "community id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          community.id,
        ),
      );
      TestValidator.predicate(
        "community name is non-empty",
        typeof community.name === "string" && community.name.length > 0,
      );
    }
  }

  // Test 2: Retrieve page 2, limit 5, sort by name ascending
  {
    const requestBody = {
      page: 2,
      limit: 5,
      sortBy: "name",
      sortOrder: "asc",
    } satisfies IRedditCommunityCommunity.IRequest;

    const response = await api.functional.redditCommunity.communities.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);

    TestValidator.predicate(
      "pagination current page is 2",
      response.pagination.current === 2,
    );
    TestValidator.predicate(
      "pagination limit is 5",
      response.pagination.limit === 5,
    );

    // Validate sorting order ascending by name
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `community name order ascending check between ${i - 1} and ${i}`,
        response.data[i - 1].name <= response.data[i].name,
      );
    }
  }

  // Test 3: Retrieve with search term filter
  {
    // Use a random substring from a random community name if possible
    const baseRequest = {
      page: 1,
      limit: 10,
    } satisfies IRedditCommunityCommunity.IRequest;

    const firstResponse =
      await api.functional.redditCommunity.communities.index(connection, {
        body: baseRequest,
      });
    typia.assert(firstResponse);

    if (firstResponse.data.length > 0) {
      const randomCommunity = RandomGenerator.pick(firstResponse.data);
      const substrLength = Math.min(randomCommunity.name.length, 3);
      const searchTerm = randomCommunity.name.substring(
        0,
        substrLength > 0 ? substrLength : 1,
      );

      const searchRequest = {
        page: 1,
        limit: 10,
        search: searchTerm,
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IRedditCommunityCommunity.IRequest;

      const searchResponse =
        await api.functional.redditCommunity.communities.index(connection, {
          body: searchRequest,
        });
      typia.assert(searchResponse);

      TestValidator.predicate(
        "search results contain only communities matching the search term",
        searchResponse.data.every((community) =>
          community.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );

      TestValidator.predicate(
        "pagination current page is 1 for search",
        searchResponse.pagination.current === 1,
      );
      TestValidator.predicate(
        "pagination limit is 10 for search",
        searchResponse.pagination.limit === 10,
      );
    }
  }
}
