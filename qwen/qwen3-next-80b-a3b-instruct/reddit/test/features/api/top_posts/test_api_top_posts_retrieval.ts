import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_top_posts_retrieval(
  connection: api.IConnection,
) {
  // Retrieve top posts using the API
  const result: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.statistics.posts.top.index(
      connection,
    );

  // Validate the response structure using typia.assert
  typia.assert(result);

  // Verify pagination metadata
  TestValidator.equals(
    "currentPage is at least 1",
    result.pagination.currentPage >= 1,
    true,
  );
  TestValidator.equals(
    "limit is between 1 and 100",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "totalRecords is non-negative",
    result.pagination.totalRecords >= 0,
    true,
  );
  TestValidator.equals(
    "totalPages is non-negative",
    result.pagination.totalPages >= 0,
    true,
  );

  // Verify that data array exists and is an array
  TestValidator.predicate("data is an array", Array.isArray(result.data));

  // Validate that each item in data array is a valid post summary (string format)
  // Since ICommunityPlatformPost.ISummary is a string type (external business identifier),
  // we verify each item is a non-empty string following UUID-like pattern
  result.data.forEach((postId) => {
    TestValidator.predicate(
      "each post ID is a non-empty UUID-like string",
      typeof postId === "string" &&
        postId.length > 0 &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          postId,
        ),
    );
  });

  // Verify that pagination metadata is consistent with data array
  // totalRecords should reflect the actual number of posts in the system
  // totalPages should be calculated from totalRecords and limit
  const calculatedTotalPages = Math.ceil(
    result.pagination.totalRecords / result.pagination.limit,
  );
  TestValidator.equals(
    "totalPages is calculated correctly by formula",
    calculatedTotalPages,
    result.pagination.totalPages,
  );

  // Validate that totalRecords is at least as large as data array length
  TestValidator.predicate(
    "totalRecords >= data array length",
    result.pagination.totalRecords >= result.data.length,
  );

  // Validate data array length matches limit on non-last page
  if (result.pagination.currentPage < result.pagination.totalPages) {
    TestValidator.equals(
      "data array length matches limit on non-last page",
      result.data.length,
      result.pagination.limit,
    );
  } else if (result.pagination.totalPages > 0) {
    // On the last page, data length can be less than limit
    TestValidator.predicate(
      "data array length <= limit on last page",
      result.data.length <= result.pagination.limit,
    );
  }

  // Validate caching - subsequent calls should return identical results
  // Since the API is based on precomputed popularity scores with caching,
  // we expect identical results on repeated calls without changes to the underlying data
  const result2: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.statistics.posts.top.index(
      connection,
    );

  // The results should be identical due to caching
  TestValidator.equals(
    "cached result matches original result",
    result,
    result2,
  );
}
