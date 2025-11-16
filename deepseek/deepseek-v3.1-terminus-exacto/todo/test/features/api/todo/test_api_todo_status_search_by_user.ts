import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoStatus";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the search and filtering functionality for todo status reference data.
 *
 * This test validates that authenticated users can retrieve paginated lists of
 * todo statuses with various filtering options including search by name, code
 * matching, active status filtering, and multiple code selection. The test
 * ensures proper pagination handling and search result accuracy for
 * administrative status management workflows.
 */
export async function test_api_todo_status_search_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      password_hash: "$2b$10$examplehashedpassword1234567890",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active" as const,
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test default pagination (no filters)
  const defaultPage = await api.functional.todoApp.user.todos.statuses.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodoStatus.IRequest,
    },
  );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default pagination should have valid structure",
    defaultPage.pagination.current === 1 &&
      defaultPage.pagination.limit === 20 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );

  // Step 3: Test search functionality
  if (defaultPage.data.length > 0) {
    const sampleStatus = defaultPage.data[0];
    const searchTerm = sampleStatus.name.substring(0, 3);

    const searchResults =
      await api.functional.todoApp.user.todos.statuses.index(connection, {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoStatus.IRequest,
      });
    typia.assert(searchResults);

    TestValidator.predicate(
      "search results should match search term",
      searchResults.data.length === 0 ||
        searchResults.data.some((status) =>
          status.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );
  }

  // Step 4: Test exact code matching
  if (defaultPage.data.length > 0) {
    const sampleCode = defaultPage.data[0].code;

    const codeResults = await api.functional.todoApp.user.todos.statuses.index(
      connection,
      {
        body: {
          code: sampleCode,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoStatus.IRequest,
      },
    );
    typia.assert(codeResults);

    TestValidator.predicate(
      "code filter should return exact match",
      codeResults.data.length === 0 ||
        codeResults.data.every((status) => status.code === sampleCode),
    );
  }

  // Step 5: Test active status filtering
  const activeResults = await api.functional.todoApp.user.todos.statuses.index(
    connection,
    {
      body: {
        is_active: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoStatus.IRequest,
    },
  );
  typia.assert(activeResults);

  TestValidator.predicate(
    "active filter should return only active statuses",
    activeResults.data.length === 0 ||
      activeResults.data.every((status) => status.is_active === true),
  );

  // Step 6: Test multiple codes filtering
  if (defaultPage.data.length >= 2) {
    const sampleCodes = [defaultPage.data[0].code, defaultPage.data[1].code];

    const multiCodeResults =
      await api.functional.todoApp.user.todos.statuses.index(connection, {
        body: {
          codes: sampleCodes,
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoStatus.IRequest,
      });
    typia.assert(multiCodeResults);

    TestValidator.predicate(
      "multiple codes filter should return matching statuses",
      multiCodeResults.data.length === 0 ||
        multiCodeResults.data.every((status) =>
          sampleCodes.includes(status.code),
        ),
    );
  }

  // Step 7: Test pagination limits
  const limitedResults = await api.functional.todoApp.user.todos.statuses.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppTodoStatus.IRequest,
    },
  );
  typia.assert(limitedResults);

  TestValidator.predicate(
    "limit should be respected",
    limitedResults.data.length <= 5,
  );

  // Step 8: Validate response structure consistency
  TestValidator.equals(
    "pagination data should be consistent",
    defaultPage.pagination.records,
    activeResults.pagination.records,
  );
}
