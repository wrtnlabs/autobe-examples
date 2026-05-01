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
 * Test searching for a guest identity with a fingerprint that does not exist.
 *
 * Validates that when a device fingerprint hash with no matching guest record is
 * submitted to the guest search endpoint, the system returns a successful
 * response (HTTP 200) with an empty result set rather than a 404 error. This
 * behavior is critical for frontend logic that checks whether a returning
 * visitor already has a guest identity — an empty page signals "no existing
 * identity" cleanly without requiring error handling.
 *
 * 1. Generate a random non-existent fingerprint hash.
 * 2. Submit the fingerprint via PATCH /todoApp/guests.
 * 3. Validate the response passes typia.assert for structural correctness.
 * 4. Verify the pagination metadata shows records: 0 and pages: 0.
 * 5. Verify the data array is empty.
 */
export async function test_api_guest_search_fingerprint_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random fingerprint that does not match any existing guest
  const nonExistentFingerprint = typia.random<string>();
  // 2. Search for the non-existent fingerprint
  const response: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(connection, {
      body: {
        fingerprint: nonExistentFingerprint,
      } satisfies ITodoAppGuest.IRequest,
    });
  typia.assert(response);
  // 3. Verify empty result set
  TestValidator.equals("records count", response.pagination.records, 0);
  TestValidator.equals("pages count", response.pagination.pages, 0);
  TestValidator.predicate(
    "data array is empty",
    () => response.data.length === 0,
  );
}
