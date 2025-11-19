import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieval behavior when memberId does not exist.
 *
 * This test validates that the API handles requests for articles by
 * non-existent members gracefully. When querying with a random UUID that
 * doesn't correspond to any member, the system should return an empty result
 * set with proper pagination metadata indicating zero records rather than
 * throwing an error.
 *
 * Steps:
 *
 * 1. Generate a random UUID that doesn't exist in the system
 * 2. Make a request to retrieve articles for this non-existent member
 * 3. Verify that an empty result set is returned with zero records
 * 4. Verify pagination metadata shows zero pages and zero total records
 */
export async function test_api_member_articles_empty_result_nonexistent_member(
  connection: api.IConnection,
) {
  // Generate a random non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  // Create request body with basic pagination parameters
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  // Call the API to retrieve articles for the non-existent member
  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.members.articles.index(connection, {
      memberId: nonExistentMemberId,
      body: requestBody,
    });

  // Validate the response structure
  typia.assert(response);

  // Verify that the data array is empty
  TestValidator.equals(
    "response data should be empty array",
    response.data,
    [],
  );

  // Verify pagination metadata indicates zero records
  TestValidator.equals(
    "total records should be zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    response.pagination.limit,
    10,
  );
}
