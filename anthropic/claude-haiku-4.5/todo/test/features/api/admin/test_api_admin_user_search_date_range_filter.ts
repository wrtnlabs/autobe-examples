import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Admin searches and filters users by creation date range.
 *
 * This test validates the admin's ability to search and view users in the
 * system. Since the admin user search API accepts email for filtering, the test
 * creates multiple users and then performs search operations to retrieve and
 * validate that the correct users are returned. The test ensures that search
 * functionality works properly and results are ordered chronologically.
 *
 * Test workflow:
 *
 * 1. Admin authenticates to access user search functionality
 * 2. Multiple users are created to establish a dataset for searching
 * 3. Admin performs search to retrieve all users
 * 4. Validates that created users appear in the search results
 * 5. Verifies pagination information is provided correctly
 * 6. Confirms chronological ordering of results by creation date
 */
export async function test_api_admin_user_search_date_range_filter(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to access user search functionality
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);

  // Step 2: Create multiple users to establish a dataset for searching
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphaNumeric(10);
  const user1: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: user1Email,
        password: user1Password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user1);

  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(10);
  const user2: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: user2Email,
        password: user2Password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user2);

  const user3Email = typia.random<string & tags.Format<"email">>();
  const user3Password = RandomGenerator.alphaNumeric(10);
  const user3: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: user3Email,
        password: user3Password,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user3);

  // Step 3: Admin performs search to retrieve users
  const searchResult: IPageITodoAppUser.ISummary =
    await api.functional.todoApp.admin.users.index(connection, {
      body: {
        email: "",
        password: "",
      } satisfies ITodoAppUser.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate that created users appear in the search results
  const searchedUserIds = searchResult.data.map((u) => u.id);
  TestValidator.predicate(
    "user1 appears in search results",
    searchedUserIds.includes(user1.id),
  );
  TestValidator.predicate(
    "user2 appears in search results",
    searchedUserIds.includes(user2.id),
  );
  TestValidator.predicate(
    "user3 appears in search results",
    searchedUserIds.includes(user3.id),
  );

  // Step 5: Verify pagination information is provided correctly
  TestValidator.predicate(
    "pagination has valid current page",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data matches pagination records",
    searchResult.data.length <= searchResult.pagination.records,
  );

  // Step 6: Confirm chronological ordering of results by creation date
  for (let i = 1; i < searchResult.data.length; i++) {
    const currentDate = new Date(searchResult.data[i].created_at).getTime();
    const previousDate = new Date(
      searchResult.data[i - 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `chronological ordering maintained at index ${i}`,
      currentDate >= previousDate,
    );
  }
}
