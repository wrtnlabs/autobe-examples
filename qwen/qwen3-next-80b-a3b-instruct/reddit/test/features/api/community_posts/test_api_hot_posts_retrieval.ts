import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_hot_posts_retrieval(
  connection: api.IConnection,
) {
  const result: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.statistics.posts.hot.index(
      connection,
    );
  typia.assert(result);

  // Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.currentPage >= 1,
  );
  TestValidator.predicate(
    "limit is between 1 and 100",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.totalRecords >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.totalPages >= 0,
  );

  // Validate that data array exists and is an array
  TestValidator.predicate("data array exists", Array.isArray(result.data));

  // Validate each post ID in the data array is a string
  for (const postId of result.data) {
    TestValidator.predicate("post id is a string", typeof postId === "string");
  }
}
