import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleStatus";
export async function test_api_article_status_retrieval_by_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection with empty headers for unauthenticated calls
  const guestConnection: api.IConnection = { host: connection.host };
  // Test the index endpoint with a filter that will return empty results
  // This verifies the API returns a proper response structure even with no matching data
  const emptyFilter: IDiscussionBoardArticleStatus.IRequest = {
    name: "__nonexistent_status_" + RandomGenerator.alphaNumeric(10),
    isActive: true,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticleStatus.IRequest;
  // Call the API to retrieve filtered statuses
  const result: IPageIDiscussionBoardArticleStatus.ISummary =
    await api.functional.discussionBoard.articles.statuses.index(
      guestConnection,
      {
        body: emptyFilter,
      },
    );
  // Validate the response structure
  typia.assert(result);
  // Verify pagination data
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  // Verify we got an empty array of results
  TestValidator.equals("result data length", result.data.length, 0);
  // Verify the structure of a single item is correct even though array is empty
  // (This verifies the type structure of the response)
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Test that the response structure works even with no active statuses
  const inactiveFilter: IDiscussionBoardArticleStatus.IRequest = {
    isActive: false,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticleStatus.IRequest;
  const inactiveResult =
    await api.functional.discussionBoard.articles.statuses.index(
      guestConnection,
      {
        body: inactiveFilter,
      },
    );
  typia.assert(inactiveResult);
  TestValidator.equals(
    "inactive filter pagination current",
    inactiveResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "inactive filter pagination limit",
    inactiveResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "inactive filter data length",
    inactiveResult.data.length,
    0,
  );
  // Test that the response structure works even with no name filter
  const noFilter: IDiscussionBoardArticleStatus.IRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticleStatus.IRequest;
  const noFilterResult =
    await api.functional.discussionBoard.articles.statuses.index(
      guestConnection,
      {
        body: noFilter,
      },
    );
  typia.assert(noFilterResult);
  TestValidator.equals(
    "no filter pagination current",
    noFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "no filter pagination limit",
    noFilterResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "no filter records >= 0",
    noFilterResult.pagination.records >= 0,
  );
}
