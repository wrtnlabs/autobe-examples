import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_empty_results(
  connection: api.IConnection,
) {
  // Search for communities with a totally unique, non-existent tag that guarantees no results
  const searchQuery: ICommunityPlatformCommunity.IRequest = {
    tag: "non-existent-tag-unique-to-test-12345" satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<30>,
  };

  // Execute the search request
  const result: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: searchQuery,
    });

  // Validate the response structure and empty results
  typia.assert(result);

  // Confirm pagination metadata reflects zero results
  TestValidator.equals(
    "totalItems should be 0",
    result.pagination.totalItems,
    0,
  );
  TestValidator.equals(
    "totalPages should be 0",
    result.pagination.totalPages,
    0,
  );
  TestValidator.equals("page should be 1", result.pagination.page, 1);
  TestValidator.equals(
    "perPage should be 20 (default)",
    result.pagination.perPage,
    20,
  );
  TestValidator.equals(
    "hasNext should be false",
    result.pagination.hasNext,
    false,
  );
  TestValidator.equals(
    "hasPrev should be false",
    result.pagination.hasPrev,
    false,
  );

  // Confirm data array is empty
  TestValidator.equals("data array should be empty", result.data.length, 0);
}
