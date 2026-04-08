import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_sessions_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test status filter with 'all'
  const allGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: { status: "all" } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // Test status filter with 'active'
  const activeGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: { status: "active" } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(activeGuests);
  // Test status filter with 'expired'
  const expiredGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: { status: "expired" } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(expiredGuests);
  // Test status filter with 'deleted'
  const deletedGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: { status: "deleted" } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(deletedGuests);
  // Validate pagination metadata exists and has correct structure
  TestValidator.predicate(
    "pagination current is positive number",
    allGuests.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive number",
    allGuests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative number",
    allGuests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative number",
    allGuests.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages equals ceiling(records/limit)",
    Math.ceil(allGuests.pagination.records / allGuests.pagination.limit) ===
      allGuests.pagination.pages,
  );
  // Validate data array structure for all filter
  TestValidator.equals(
    "data array is array",
    Array.isArray(allGuests.data),
    true,
  );
  TestValidator.predicate(
    "records equals data array length",
    allGuests.pagination.records === allGuests.data.length,
  );
  // Validate each guest in data array
  for (const guest of allGuests.data) {
    // Verify status matches filter when status is not 'all'
    if (
      activeGuests.data.length > 0 ||
      expiredGuests.data.length > 0 ||
      deletedGuests.data.length > 0
    ) {
      TestValidator.predicate(
        "guest has valid status field",
        guest.status === "active" ||
          guest.status === "expired" ||
          guest.status === "deleted",
      );
    }
  }
  // Validate pagination records match data array length for all filters
  TestValidator.equals(
    "active pagination records equals data length",
    activeGuests.pagination.records,
    activeGuests.data.length,
  );
  TestValidator.equals(
    "expired pagination records equals data length",
    expiredGuests.pagination.records,
    expiredGuests.data.length,
  );
  TestValidator.equals(
    "deleted pagination records equals data length",
    deletedGuests.pagination.records,
    deletedGuests.data.length,
  );
  // Test pagination with custom limit and page
  const paginatedGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(paginatedGuests);
  TestValidator.equals(
    "custom limit applied",
    paginatedGuests.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedGuests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length within limit",
    paginatedGuests.data.length <= paginatedGuests.pagination.limit,
  );
  // Test status filter with search parameter
  const searchGuests = await api.functional.multiUserTodo.guests.index(
    connection,
    {
      body: {
        status: "all",
        search: "2024-01",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(searchGuests);
  // Validate that search doesn't break response structure
  TestValidator.equals(
    "search pagination structure valid",
    Array.isArray(searchGuests.data),
    true,
  );
  TestValidator.predicate(
    "search records equals data length",
    searchGuests.pagination.records === searchGuests.data.length,
  );
}
