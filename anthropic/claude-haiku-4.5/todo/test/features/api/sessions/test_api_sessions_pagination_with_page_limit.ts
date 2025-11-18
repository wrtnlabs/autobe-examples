import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test pagination functionality with specific page and limit parameters for
 * user authentication sessions.
 *
 * This test validates that pagination correctly divides session results and
 * returns the requested page. The scenario covers:
 *
 * 1. Register a new user to establish an authenticated session
 * 2. Request the first page of sessions with limit 10
 * 3. Verify pagination metadata shows current page=1 and limit=10
 * 4. Verify the returned records count matches the actual items returned
 * 5. Request different page numbers to validate offset calculations work correctly
 *
 * The test ensures that the pagination system properly handles page parameters,
 * enforces limit constraints, and correctly calculates pagination information
 * (current page, limit, total records, and total pages).
 */
export async function test_api_sessions_pagination_with_page_limit(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish initial authenticated session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Step 2: Request the first page of sessions with limit 10
  const pageLimit = 10;
  const firstPageResult =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: pageLimit,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(firstPageResult);

  // Step 3: Verify pagination metadata shows current page=1 and limit=10
  TestValidator.equals(
    "pagination current page should be 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    firstPageResult.pagination.limit,
    pageLimit,
  );

  // Step 4: Verify the returned records count matches the actual items returned
  const actualDataLength = firstPageResult.data.length;
  TestValidator.predicate(
    "data array length should not exceed page limit",
    actualDataLength <= pageLimit,
  );

  TestValidator.predicate(
    "pagination records should be >= data array length",
    firstPageResult.pagination.records >= actualDataLength,
  );

  // Step 5: Request different page numbers to validate offset calculations
  if (firstPageResult.pagination.pages > 1) {
    // If there are multiple pages, test fetching page 2
    const secondPageResult =
      await api.functional.todoList.user.auth.user.sessions.index(connection, {
        body: {
          page: 2,
          limit: pageLimit,
        } satisfies ITodoListSession.IRequest,
      });
    typia.assert(secondPageResult);

    // Verify page 2 metadata
    TestValidator.equals(
      "pagination current page should be 2",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit should match",
      secondPageResult.pagination.limit,
      pageLimit,
    );

    // Verify that page 2 has different data than page 1 (unless empty)
    if (secondPageResult.data.length > 0 && firstPageResult.data.length > 0) {
      TestValidator.notEquals(
        "page 2 should have different data than page 1",
        firstPageResult.data[0].id,
        secondPageResult.data[0].id,
      );
    }
  }

  // Verify pagination calculations
  const expectedPages = Math.ceil(
    firstPageResult.pagination.records / firstPageResult.pagination.limit,
  );
  TestValidator.equals(
    "calculated pages should match pagination.pages",
    firstPageResult.pagination.pages,
    expectedPages,
  );
}
