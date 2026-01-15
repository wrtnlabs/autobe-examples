import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
export async function test_api_appeal_list_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create an unauthenticated connection for test
  const guestConnection: api.IConnection = { host: connection.host };
  // Define status values to test
  const statusValues = ["pending", "reviewed", "resolved", "rejected"] as const;
  // Test filtering by each status
  for (const status of statusValues) {
    // Create request with specific status filter and consistent pagination
    const request: IDiscussionBoardAppeal.IRequest = {
      status,
      limit: 10,
      page: 1,
    } satisfies IDiscussionBoardAppeal.IRequest;
    // Call the API endpoint with the request body
    const response: IPageIDiscussionBoardAppeal.ISummary =
      await api.functional.discussionBoard.appeals.index(guestConnection, {
        body: request,
      });
    typia.assert(response);
    // Verify pagination structure is correct
    TestValidator.equals(
      "pagination has correct current page",
      response.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination has correct limit",
      response.pagination.limit,
      10,
    );
    TestValidator.predicate(
      "pagination has positive records",
      response.pagination.records > 0,
    );
    TestValidator.predicate(
      "pagination has positive pages",
      response.pagination.pages >= 1,
    );
    // Verify that all returned appeals have the expected status
    TestValidator.predicate(
      "all returned appeals have the filtered status",
      response.data.every((appeal) => appeal.status === status),
    );
    // Verify each appeal has proper structure
    response.data.forEach((appeal) => {
      // Using typia.assert already confirmed type safety, so only validate business logic
      // No additional type checks are needed
    });
  }
  // Test pagination by requesting multiple pages for one status
  const requestForPagination: IDiscussionBoardAppeal.IRequest = {
    status: "pending",
    limit: 3, // Small limit for pagination test
    page: 1,
  } satisfies IDiscussionBoardAppeal.IRequest;
  const firstPage: IPageIDiscussionBoardAppeal.ISummary =
    await api.functional.discussionBoard.appeals.index(guestConnection, {
      body: requestForPagination,
    });
  typia.assert(firstPage);
  const secondPage: IPageIDiscussionBoardAppeal.ISummary =
    await api.functional.discussionBoard.appeals.index(guestConnection, {
      body: {
        ...requestForPagination,
        page: 2,
      },
    });
  typia.assert(secondPage);
  // Verify second page has different data than first page
  TestValidator.notEquals(
    "second page has different data than first page",
    firstPage.data,
    secondPage.data,
  );
  // Verify pagination metadata consistency across pages
  TestValidator.equals(
    "second page pagination limit matches first page",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  TestValidator.equals(
    "second page pagination current matches expected",
    secondPage.pagination.current,
    2,
  );
}
