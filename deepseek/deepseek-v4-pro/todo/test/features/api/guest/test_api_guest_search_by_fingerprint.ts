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
 * Test searching for a guest identity by device fingerprint hash.
 *
 * Validates that the PATCH /todoApp/guests endpoint correctly performs exact-match lookup against the unique fingerprint column. Since fingerprints are unique across all guest records, the response should contain at most one matching guest entry or an empty page when no guest possesses the given fingerprint.
 *
 * The test also verifies that pagination metadata is correctly computed for both the found and not-found cases, and that the fingerprint field in the returned guest matches the search input exactly.
 *
 * 1. Generate a random fingerprint hash to use as the search criteria.
 * 2. Call the guest search endpoint with the generated fingerprint.
 * 3. Validate the full response structure with typia.assert.
 * 4. Check pagination metadata reflects at most one matching record.
 * 5. When a guest is found, verify its fingerprint matches the search input.
 */
export async function test_api_guest_search_by_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  const fingerprint = typia.random<string & tags.Format<"uuid">>();
  const page = await api.functional.todoApp.guests.index(connection, {
    body: {
      fingerprint,
    } satisfies ITodoAppGuest.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "at most one record matches unique fingerprint",
    page.pagination.records <= 1,
  );
  TestValidator.predicate(
    "at most one page for single result",
    page.pagination.pages <= 1,
  );
  TestValidator.predicate(
    "current page defaults to 1",
    page.pagination.current === 1,
  );
  if (page.data.length > 0) {
    const guest = page.data[0];
    TestValidator.equals(
      "returned fingerprint matches search input",
      guest.fingerprint,
      fingerprint,
    );
  }
}
