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
export async function test_api_appeal_list_sorted_by_submission_date(
  connection: api.IConnection,
): Promise<void> {
  // Construct request with sort parameters
  const requestBody: IDiscussionBoardAppeal.IRequest = {
    sortBy: "submitted_at",
    sortOrder: "desc",
    page: 1,
    limit: 2,
  };
  // Call the API endpoint
  const firstPage: IPageIDiscussionBoardAppeal.ISummary =
    await api.functional.discussionBoard.appeals.index(connection, {
      body: requestBody,
    });
  // Validate response structure and types
  typia.assert(firstPage);
  // Verify pagination properties
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 2", firstPage.pagination.limit, 2);
  // Verify we got at least one result (required for ordering validation)
  TestValidator.predicate(
    "at least one appeal exists",
    firstPage.data.length > 0,
  );
  // Verify ordering among first page items (newest first)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const currentAppeal = firstPage.data[i];
    const nextAppeal = firstPage.data[i + 1];
    const currentDate = new Date(currentAppeal.created_at).getTime();
    const nextDate = new Date(nextAppeal.created_at).getTime();
    TestValidator.predicate(
      `appeal ${i} is newer than appeal ${i + 1} in first page`,
      currentDate >= nextDate,
    );
  }
  // Test for second page if total records exceed page size
  if (firstPage.pagination.records > firstPage.pagination.limit) {
    // Request second page
    const secondPageBody: IDiscussionBoardAppeal.IRequest = {
      sortBy: "submitted_at",
      sortOrder: "desc",
      page: 2,
      limit: 2,
    };
    const secondPage: IPageIDiscussionBoardAppeal.ISummary =
      await api.functional.discussionBoard.appeals.index(connection, {
        body: secondPageBody,
      });
    typia.assert(secondPage);
    // Verify data exists on second page
    TestValidator.predicate(
      "second page has at least one appeal",
      secondPage.data.length > 0,
    );
    // Verify ordering between pages: last item of first page should be newer or equal to first item of second page
    const lastItemFirstPage = firstPage.data[firstPage.data.length - 1];
    const firstItemSecondPage = secondPage.data[0];
    const lastDateFirstPage = new Date(lastItemFirstPage.created_at).getTime();
    const firstDateSecondPage = new Date(
      firstItemSecondPage.created_at,
    ).getTime();
    TestValidator.predicate(
      "last appeal of first page is newer or same age as first appeal of second page",
      lastDateFirstPage >= firstDateSecondPage,
    );
    // Verify ordering within second page
    for (let i = 0; i < secondPage.data.length - 1; i++) {
      const currentAppeal = secondPage.data[i];
      const nextAppeal = secondPage.data[i + 1];
      const currentDate = new Date(currentAppeal.created_at).getTime();
      const nextDate = new Date(nextAppeal.created_at).getTime();
      TestValidator.predicate(
        `appeal ${i} is newer than appeal ${i + 1} in second page`,
        currentDate >= nextDate,
      );
    }
  }
}
