import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";
export async function test_api_category_filtering_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection for public access testing
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate test data for category filtering
  const randomName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const randomDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  // Create category request with name and description filters (without status or creation date)
  const categoryRequest: IDiscussionBoardArticleCategory.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "order",
    order: "asc",
    name: randomName,
    description: randomDescription,
    // status and created_at_from/to are intentionally omitted as they're restricted for public access
  };
  // Execute the category filtering API call
  const response: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      publicConnection,
      {
        body: categoryRequest,
      },
    );
  // Validate response structure and pagination
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    () => response.pagination.pages >= 1,
  );
  // Validate that returned data contains at least one category
  TestValidator.predicate(
    "at least one category returned",
    () => response.data.length > 0,
  );
  // Verify that each returned category's status is active (as public users only see active categories)
  for (const category of response.data) {
    TestValidator.equals(
      "category status is active",
      category.status,
      "active",
    );
  }
  // Additional test case: fetch all active categories with null filters (no filtering)
  const nullFilterRequest: IDiscussionBoardArticleCategory.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "order",
    order: "asc",
    name: null,
    description: null,
  };
  const nullFilterResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articles.categories.index(
      publicConnection,
      {
        body: nullFilterRequest,
      },
    );
  // Validate response structure and pagination for null filter
  typia.assert(nullFilterResponse);
  // Validate that at least one category is returned (should return all active categories)
  TestValidator.predicate(
    "at least one active category returned with null filters",
    () => nullFilterResponse.data.length > 0,
  );
  // Verify status is active for all categories when no filters applied
  for (const category of nullFilterResponse.data) {
    TestValidator.equals(
      "category status is active with null filters",
      category.status,
      "active",
    );
  }
}
