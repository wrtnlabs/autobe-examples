import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test admin filtering of guest records by visit date range.
 *
 * Validates that an admin can filter guest visitor records using
 * visit_date_from and visit_date_to parameters for time-based traffic pattern
 * analysis. This test ensures that only guests who visited within the specified
 * date range are returned, and that both boundary conditions are properly
 * applied.
 *
 * Steps:
 *
 * 1. Admin authenticates by joining the system
 * 2. Define a specific date range for filtering (30-day window)
 * 3. Search for guests with visit_date_from and visit_date_to parameters
 * 4. Validate that all returned guests have visited_at within the specified range
 * 5. Verify the date range filtering works with timezone-aware ISO 8601 timestamps
 */
export async function test_api_guest_list_filtering_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Define date range for filtering (30-day window)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const visitDateFrom = thirtyDaysAgo.toISOString();
  const visitDateTo = now.toISOString();

  // Step 3: Search for guests with date range filter
  const guestSearchRequest = {
    page: 1,
    limit: 20,
    visit_date_from: visitDateFrom,
    visit_date_to: visitDateTo,
  } satisfies ITodoListGuest.IRequest;

  const guestPage: IPageITodoListGuest.ISummary =
    await api.functional.todoList.admin.guests.index(connection, {
      body: guestSearchRequest,
    });
  typia.assert(guestPage);

  // Step 4: Validate all returned guests are within the date range (business logic)
  const fromDate = new Date(visitDateFrom);
  const toDate = new Date(visitDateTo);

  for (const guest of guestPage.data) {
    const visitedAt = new Date(guest.visited_at);

    TestValidator.predicate(
      "guest visited_at is within date range - after or equal to from date",
      visitedAt >= fromDate,
    );

    TestValidator.predicate(
      "guest visited_at is within date range - before or equal to to date",
      visitedAt <= toDate,
    );
  }
}
