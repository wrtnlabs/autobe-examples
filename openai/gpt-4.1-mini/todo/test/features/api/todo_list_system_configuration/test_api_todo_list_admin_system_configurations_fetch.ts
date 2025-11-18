import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodoListSystemConfiguration";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListTodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListSystemConfiguration";

/**
 * Test the retrieval of filtered, paginated todo list system configurations by
 * an authenticated administrator.
 *
 * The test performs the following steps:
 *
 * 1. Registers a new admin to acquire authentication tokens.
 * 2. Uses the admin authentication context to call the
 *    todoListSystemConfigurations listing endpoint with search parameters.
 * 3. Validates that the response pagination metadata and data list conform to the
 *    search and paging criteria.
 * 4. Ensures that type assertions on responses pass without error.
 *
 * This test ensures that complex filters, sorting, and paging controls operate
 * correctly and return appropriately filtered configuration data with expected
 * structure and types.
 */
export async function test_api_todo_list_admin_system_configurations_fetch(
  connection: api.IConnection,
) {
  // 1. Admin registration to obtain authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = "very-secure-password123!";

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // After join, connection automatically updated with Authorization header

  // 2. Prepare request body with realistic search and pagination values
  const requestBody = {
    page: 1,
    limit: 10,
    search: "config",
    orderBy: "key",
    orderDirection: "asc",
  } satisfies ITodoListTodoListSystemConfiguration.IRequest;

  // 3. Call patch index endpoint to fetch filtered configurations
  const response: IPageITodoListTodoListSystemConfiguration.ISummary =
    await api.functional.todoList.admin.todoListSystemConfigurations.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);

  // 4. Validate pagination response consistency
  TestValidator.predicate(
    "pagination current page should be request page",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be request limit",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    response.pagination.records >= 0,
  );

  // 5. Validate data array items conform to summary schema
  for (const config of response.data) {
    typia.assert(config);
    TestValidator.predicate(
      "config key contains search string",
      config.key.includes("config"),
    );
  }
}
