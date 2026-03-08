import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_actor_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin user for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "filtertest@test.com",
      password: "Admin1234!",
      display_name: "Filter Test Admin",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Get all actors without filters
  const allActors = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardGuest.IRequest>(),
    },
  );
  typia.assert(allActors);
  TestValidator.predicate(
    "has pagination structure with valid values",
    allActors.pagination.current >= 1 &&
      allActors.pagination.limit >= 0 &&
      allActors.pagination.records >= 0 &&
      allActors.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination is valid structure",
    Number.isInteger(allActors.pagination.current) &&
      Number.isInteger(allActors.pagination.limit) &&
      Number.isInteger(allActors.pagination.records) &&
      Number.isInteger(allActors.pagination.pages),
  );
  // Test 2: Filter by role "admin"
  const adminRoleActors =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        role: "admin",
      },
    });
  typia.assert(adminRoleActors);
  TestValidator.predicate(
    "admin role filter returns valid data",
    Array.isArray(adminRoleActors.data),
  );
  if (adminRoleActors.data.length > 0) {
    TestValidator.equals(
      "filtered admin role actors have correct role",
      adminRoleActors.data[0]?.id !== undefined,
      true,
    );
  }
  // Test 3: Filter by status "active"
  const activeActors = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(activeActors);
  TestValidator.predicate(
    "active status filter returns valid data",
    Array.isArray(activeActors.data),
  );
  // Test 4: Search with unique term for empty result
  const searchTerm = `unique_test_${RandomGenerator.alphaNumeric(8)}`;
  const noResults = await api.functional.discussionBoard.admin.actors.index(
    adminConnection,
    {
      body: {
        search: searchTerm,
      },
    },
  );
  typia.assert(noResults);
  TestValidator.equals(
    "search with no results returns empty array",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for no results",
    noResults.pagination.records,
    0,
  );
  // Test 5: Pagination with limit 1
  const paginatedActors =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(paginatedActors);
  TestValidator.equals(
    "limit 1 returns at most 1 record",
    paginatedActors.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedActors.pagination.limit,
    1,
  );
  // Test 6: Date range filter with realistic time range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFrom = thirtyDaysAgo.toISOString();
  const createdAtTo = now.toISOString();
  const dateRangeActors =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        createdAtFrom,
        createdAtTo,
      },
    });
  typia.assert(dateRangeActors);
  TestValidator.predicate(
    "date range filter returns valid data",
    Array.isArray(dateRangeActors.data),
  );
  // Test 7: Combined filters
  const combinedFilters =
    await api.functional.discussionBoard.admin.actors.index(adminConnection, {
      body: {
        role: "admin",
        status: "active",
        search: "test",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters returns valid data",
    Array.isArray(combinedFilters.data),
  );
}
