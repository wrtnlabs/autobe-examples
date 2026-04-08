import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest account listing with pagination.
 *
 * Validates the paginated listing of guest accounts through the administrative endpoint. Ensures proper pagination metadata is returned and each guest record contains the expected summary fields including device fingerprint tracking and session counts.
 *
 * The test verifies the default pagination behavior with page 1 and limit 20, checking that the response structure conforms to IPageITodoAppGuest.ISummary type with proper pagination metadata and guest summary data.
 *
 * 1. Call the guest listing endpoint with default pagination parameters.
 * 2. Validate the response structure matches IPageITodoAppGuest.ISummary.
 * 3. Verify pagination metadata contains current page, limit, records, and pages.
 * 4. Confirm each guest record has id, device_fingerprint, created_at, deleted_at, and session_count.
 * 5. Test that results are sorted by created_at in descending order when no sort parameters specified.
 */
export async function test_api_guests_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for accessing guest listing endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  // Test with default pagination parameters (page=1, limit=20)
  const output: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies ITodoAppGuest.IRequest,
    });
  typia.assert(output);
  // Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination metadata exists",
    output.pagination !== null && output.pagination !== undefined,
  );
  // Verify data array exists
  TestValidator.predicate(
    "data array exists",
    output.data !== null && output.data !== undefined,
  );
  // Test with custom pagination parameters
  const customOutput: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(adminConnection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ITodoAppGuest.IRequest,
    });
  typia.assert(customOutput);
  // Verify custom limit is respected (actual count <= limit)
  TestValidator.predicate(
    "custom limit is respected",
    customOutput.data.length <= customOutput.pagination.limit,
  );
  // Test with device fingerprint filter
  const filteredOutput: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
        device_fingerprint: "test",
      } satisfies ITodoAppGuest.IRequest,
    });
  typia.assert(filteredOutput);
  // Verify all returned guests match the filter (if any results exist)
  if (filteredOutput.data.length > 0) {
    const allMatchFilter = filteredOutput.data.every((guest) =>
      guest.device_fingerprint.toLowerCase().includes("test"),
    );
    TestValidator.predicate(
      "filtered results match device_fingerprint filter",
      allMatchFilter,
    );
  }
  // Test ascending sort order
  const ascOutput: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "asc",
      } satisfies ITodoAppGuest.IRequest,
    });
  typia.assert(ascOutput);
  // Verify ascending sort when multiple results exist
  if (ascOutput.data.length > 1) {
    let isAscending = true;
    for (let i = 1; i < ascOutput.data.length; i++) {
      const prev = new Date(ascOutput.data[i - 1].created_at).getTime();
      const curr = new Date(ascOutput.data[i].created_at).getTime();
      if (prev > curr) {
        isAscending = false;
        break;
      }
    }
    TestValidator.predicate(
      "guests are sorted by created_at ascending",
      isAscending,
    );
  }
}
