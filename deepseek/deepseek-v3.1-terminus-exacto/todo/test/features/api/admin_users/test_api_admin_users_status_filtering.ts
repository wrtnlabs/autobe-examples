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

/**
 * Test the account status filtering capabilities of the admin user listing.
 * Test filtering for active-only users, deleted-only users, and retrieving
 * all users regardless of status. Verify that the filtering parameters work
 * as expected with existing user data.
 */
export async function test_api_admin_users_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for user management operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Test filtering for active users only
  const activeOnlyResponse = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(activeOnlyResponse);
  // Test filtering for deleted users only
  const deletedOnlyResponse = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(deletedOnlyResponse);
  // Test retrieving all users regardless of status
  const allUsersResponse = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: null,
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(allUsersResponse);
  // Verify pagination metadata exists and has valid values
  TestValidator.predicate(
    "pagination metadata exists",
    activeOnlyResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    activeOnlyResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    activeOnlyResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is valid",
    activeOnlyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    activeOnlyResponse.pagination.pages >= 0,
  );
  // Test with search functionality combined with status filtering
  const searchResponse = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: true,
        search: "a", // Use a common letter to likely get results
        page: 1,
        limit: 5,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Test edge case: search with unlikely term
  const unlikelySearchResponse = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: true,
        search: "xyz123unlikelysearchterm",
        page: 1,
        limit: 10,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(unlikelySearchResponse);
  // Verify that response data structure is correct for all users
  if (allUsersResponse.data.length > 0) {
    const sampleUser = allUsersResponse.data[0];
    TestValidator.predicate("user has id", typeof sampleUser.id === "string");
    TestValidator.predicate(
      "user has email",
      typeof sampleUser.email === "string",
    );
    TestValidator.predicate(
      "user has display_name",
      typeof sampleUser.display_name === "string",
    );
    TestValidator.predicate(
      "user has created_at",
      typeof sampleUser.created_at === "string",
    );
  }
  // Test different page sizes
  const smallPageResponse = await api.functional.todoApp.users.index(
    adminConnection,
    {
      body: {
        active: null,
        page: 1,
        limit: 1,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(smallPageResponse);
  TestValidator.equals(
    "small page limit",
    smallPageResponse.pagination.limit,
    1,
  );
}
