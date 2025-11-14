import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_post_creation_valid_data(
  connection: api.IConnection,
) {
  const communityCode = RandomGenerator.alphaNumeric(10);
  const searchKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });

  // Search for posts with valid criteria and a keyword that should return results
  const response: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityCode,
      body: searchKeyword,
    });

  typia.assert(response);

  // Validate the pagination metadata structure
  TestValidator.predicate(
    "currentPage is positive",
    response.pagination.currentPage >= 1,
  );
  TestValidator.predicate(
    "limit is within bounds",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "totalRecords is non-negative",
    response.pagination.totalRecords >= 0,
  );
  TestValidator.predicate(
    "totalPages is non-negative",
    response.pagination.totalPages >= 0,
  );

  // Validate that data array exists and contains post summaries (strings)
  TestValidator.predicate(
    "post data exists",
    Array.isArray(response.data) && response.data.length >= 0,
  );

  // Validate that each item in data is a string (ICommunityPlatformPost.ISummary type)
  if (response.data.length > 0) {
    TestValidator.predicate(
      "first post is string",
      typeof response.data[0] === "string",
    );
    TestValidator.predicate(
      "first post length is reasonable",
      response.data[0].length > 0,
    );
  }
}
