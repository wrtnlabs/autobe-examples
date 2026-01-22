import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
/**
 * Test retrieving the guest list filtered by status and creation date range.
 *
 * This test sends a PATCH request to the /todoApp/guests endpoint with
 * filtering criteria including status, createdAfter, and createdBefore
 * timestamps. It validates that all returned guests match the filter conditions
 * and that pagination metadata is correct.
 *
 * Steps:
 *
 * 1. Prepare filter object with realistic status and date range
 * 2. Send the PATCH request to fetch guests
 * 3. Assert the response type and structure
 * 4. Verify all guests' statuses and creation dates match the filters
 * 5. Verify pagination fields exist and are valid
 */
export async function test_api_guest_list_filtered_by_status_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // The todoApp guests API is public, no authentication required
  // We'll use realistic date-time strings for createdAfter and createdBefore
  // Sample status value from domain
  // Construct request body
  const createdAfter = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdBefore = new Date().toISOString();
  const status = "active";
  const page = 1;
  const limit = 10;
  const requestBody = {
    page,
    limit,
    status,
    createdAfter,
    createdBefore,
  } satisfies ITodoAppGuest.IRequest;
  // Execute API call
  const response = await api.functional.todoApp.guests.index(connection, {
    body: requestBody,
  });
  // Assert response shape
  typia.assert(response);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    response.pagination.limit > 0,
  );
  // For each guest, check created date is in range and status matches
  for (const guest of response.data) {
    // created_at is ISO string - compare with createdAfter and createdBefore strings
    TestValidator.predicate(
      `guest ${guest.id} created_at after createdAfter`,
      guest.created_at >= createdAfter,
    );
    TestValidator.predicate(
      `guest ${guest.id} created_at before createdBefore`,
      guest.created_at <= createdBefore,
    );
    // The guest status is filtered in request but not directly present in ISummary according to DTO - The guest status property does not exist in summary DTO. So we can't validate status per guest, skipping per guest status check.
    // Instead, we can only rely that filter worked indirectly if API contract guarantees it
    // So we skip status validation on guests
  }
}
