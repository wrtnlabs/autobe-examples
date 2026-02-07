import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_users_list_with_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for administrative operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Since we cannot create users through available API functions,
  // we'll test the search and pagination functionality with existing data
  // and focus on validating the response structure and pagination logic
  // Test 1: Basic pagination with default parameters
  const page1 = await api.functional.todoApp.users.index(adminConnection, {
    body: {
      page: 1,
      limit: 10,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(page1);
  TestValidator.predicate(
    "pagination structure valid",
    page1.pagination.current === 1 &&
      page1.pagination.limit === 10 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );
  // Test 2: Search by common patterns
  const searchResult = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        search: "@",
        page: 1,
        limit: 5,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResult);
  // Test 3: Filter by active status only
  const activeUsers = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(activeUsers);
  // Test 4: Filter by deleted status only
  const deletedUsers = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(deletedUsers);
  // Test 5: Combined search and status filter
  const combinedFilter = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        search: "example",
        active: true,
        page: 1,
        limit: 5,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(combinedFilter);
  // Test 6: Empty search results with unlikely pattern
  const emptySearch = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        search: "xyz123nonexistentpattern789abc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid structure",
    emptySearch.pagination.records >= 0 && emptySearch.pagination.pages >= 0,
  );
  // Test 7: Different page sizes
  const smallPage = await api.functional.todoApp.users.index(adminConnection, {
    body: {
      page: 1,
      limit: 3,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(smallPage);
  TestValidator.predicate(
    "small page size respected",
    smallPage.data.length <= 3,
  );
  const mediumPage = await api.functional.todoApp.users.index(adminConnection, {
    body: {
      page: 1,
      limit: 25,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(mediumPage);
  TestValidator.predicate(
    "medium page size respected",
    mediumPage.data.length <= 25,
  );
  // Test 8: Multi-page pagination (if there are enough records)
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.todoApp.users.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    });
    typia.assert(page2);
    TestValidator.equals(
      "page 2 has correct page number",
      page2.pagination.current,
      2,
    );
    // Verify pagination consistency
    TestValidator.equals(
      "total records consistent",
      page1.pagination.records,
      page2.pagination.records,
    );
    TestValidator.equals(
      "page limit consistent",
      page1.pagination.limit,
      page2.pagination.limit,
    );
  }
  // Test 9: No filters (all users)
  const allUsers = await api.functional.todoApp.users.index(adminConnection, {
    body: {
      page: 1,
      limit: 100,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(allUsers);
  // Validate response structure for all user summaries
  const allResponses = [
    page1,
    searchResult,
    activeUsers,
    deletedUsers,
    combinedFilter,
    emptySearch,
    smallPage,
    mediumPage,
    allUsers,
  ];
  for (const response of allResponses) {
    // Validate pagination structure
    TestValidator.predicate(
      "pagination has current page",
      typeof response.pagination.current === "number",
    );
    TestValidator.predicate(
      "pagination has limit",
      typeof response.pagination.limit === "number",
    );
    TestValidator.predicate(
      "pagination has records count",
      typeof response.pagination.records === "number",
    );
    TestValidator.predicate(
      "pagination has pages count",
      typeof response.pagination.pages === "number",
    );
    // Validate user summary structure for each user in the response
    for (const user of response.data) {
      typia.assert<ITodoAppUser.ISummary>(user);
      // Verify that only summary fields are present and have correct types
      TestValidator.predicate(
        "user id is uuid format",
        typeof user.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            user.id,
          ),
      );
      TestValidator.predicate(
        "user email is valid format",
        typeof user.email === "string" && user.email.includes("@"),
      );
      TestValidator.predicate(
        "user display_name is string",
        typeof user.display_name === "string",
      );
      TestValidator.predicate(
        "user created_at is date-time format",
        typeof user.created_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(user.created_at),
      );
    }
  }
  // Test edge case: page number beyond total pages
  if (page1.pagination.pages > 0) {
    const beyondPages = await api.functional.todoApp.users.index(
      adminConnection,
      {
        body: {
          page: page1.pagination.pages + 10,
          limit: 10,
        } satisfies ITodoAppUser.IRequest,
      },
    );
    typia.assert(beyondPages);
    TestValidator.equals(
      "beyond pages returns empty data",
      beyondPages.data.length,
      0,
    );
  }
}
