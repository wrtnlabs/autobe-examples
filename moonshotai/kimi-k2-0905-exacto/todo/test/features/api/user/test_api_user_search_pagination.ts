import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user search with custom pagination settings.
 *
 * This test validates the user search pagination functionality by:
 *
 * 1. Creating multiple user accounts to generate test data
 * 2. Testing various pagination scenarios with different page numbers and limits
 * 3. Verifying pagination metadata accuracy (current page, limit, total records,
 *    total pages)
 * 4. Ensuring the limit parameter properly constrains result set size
 * 5. Validating that pagination calculations are correct
 *
 * The test covers both successful pagination scenarios and edge cases to ensure
 * robust pagination functionality in the user management system.
 */
export async function test_api_user_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create multiple user accounts for pagination testing
  const userCount = 15;
  const createdUsers: ITodoAppUser.IAuthorized[] = [];

  for (let i = 0; i < userCount; i++) {
    const email = typia.random<string & tags.Format<"email">>();
    const user = await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: "testPassword123",
        name: RandomGenerator.name(),
        href: `https://todoapp.com/register/${typia.random<string & tags.Format<"uuid">>()}`,
        referrer: `https://todoapp.com/invite/${typia.random<string & tags.Format<"uuid">>()}`,
      } satisfies ITodoAppUser.ICreate,
    });
    typia.assert(user);
    createdUsers.push(user);
  }

  // Verify we have the expected number of users
  TestValidator.equals("created user count", createdUsers.length, userCount);

  // Step 2: Test pagination with default settings (page 1, limit 10)
  const defaultPage = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(defaultPage);

  TestValidator.predicate("default page has data", defaultPage.data.length > 0);
  TestValidator.equals(
    "default page current is 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page limit is 10",
    defaultPage.pagination.limit,
    10,
  );

  // Step 3: Test pagination with smaller limit (page 1, limit 5)
  const page1Limit5 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(page1Limit5);

  TestValidator.equals("page 1 limit 5 data count", page1Limit5.data.length, 5);
  TestValidator.equals(
    "page 1 limit 5 current page",
    page1Limit5.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit 5 limit", page1Limit5.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 limit 5 has sufficient total records",
    page1Limit5.pagination.records >= userCount,
  );

  // Step 4: Test pagination with different page number (page 2, limit 5)
  const page2Limit5 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(page2Limit5);

  TestValidator.equals(
    "page 2 limit 5 current page",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit 5 limit", page2Limit5.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 has different data from page 1",
    page2Limit5.data[0]?.id !== page1Limit5.data[0]?.id,
  );

  // Step 5: Test pagination with higher limit (page 1, limit 15 to get all users)
  const page1AllUsers = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20, // Higher than our created user count
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(page1AllUsers);

  TestValidator.predicate(
    "page 1 all users has our created users",
    page1AllUsers.data.length >= userCount,
  );
  TestValidator.equals(
    "page 1 all users limit",
    page1AllUsers.pagination.limit,
    20,
  );

  // Step 6: Test pagination edge case - requesting page beyond available data
  const pageBeyond = await api.functional.todoApp.user.users.index(connection, {
    body: {
      page: 1000, // Very high page number
      limit: 5,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(pageBeyond);

  TestValidator.equals(
    "page beyond available has no data",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "page beyond current page",
    pageBeyond.pagination.current,
    1000,
  );

  // Step 7: Test pagination with search filter to verify filtering works with pagination
  const searchEmail = createdUsers[0].email;
  const searchPrefix = searchEmail.split("@")[0];
  const filteredPage = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search:
          searchPrefix.length > 200
            ? searchPrefix.substring(0, 200)
            : searchPrefix,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(filteredPage);

  TestValidator.predicate(
    "filtered page has reasonable results",
    filteredPage.data.length <= 10 && filteredPage.data.length >= 0,
  );

  if (filteredPage.data.length > 0) {
    TestValidator.predicate(
      "filtered results should include searched user",
      filteredPage.data.some((user) => user.email === searchEmail),
    );
  }

  // Step 8: Verify pagination metadata calculations are mathematically correct
  TestValidator.equals(
    "total pages calculation is mathematically correct",
    page1Limit5.pagination.pages,
    Math.ceil(page1Limit5.pagination.records / page1Limit5.pagination.limit),
  );

  TestValidator.equals(
    "total records count is consistent across pages",
    page1Limit5.pagination.records,
    page2Limit5.pagination.records,
  );

  TestValidator.equals(
    "total pages count is consistent for same limit",
    page1Limit5.pagination.pages,
    page2Limit5.pagination.pages,
  );

  // Step 9: Verify pagination respects max limit constraint (100)
  const maxLimitTest = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(maxLimitTest);

  TestValidator.predicate(
    "max limit test respects constraint",
    maxLimitTest.data.length <= 100,
  );
}
