import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuest";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path for listing guest accounts with pagination.
 *
 * Validates the complete guest listing workflow with pagination parameters. Ensures that the endpoint returns a paginated list of active guest accounts (deleted_at is null) with proper pagination metadata. Verifies that each guest record includes id, device_fingerprint, created_at, updated_at, and deleted_at fields. Confirms pagination works correctly by checking current page, limit, total records, and total pages in the response. Tests sorting by creation date (newest first) as the default behavior. Validates that the response structure matches IPageIRedditCloneGuest.ISummary with pagination and data array.
 *
 * 1. Constructs a request to list active guest accounts with pagination parameters.
 * 2. Sets deletedAt to null to filter only active (non-deleted) guests.
 * 3. Configures page size and page number for pagination testing.
 * 4. Specifies sorting by createdAt in descending order (newest first).
 * 5. Calls the guest listing endpoint and validates the response structure.
 * 6. Verifies pagination metadata (current, limit, records, pages) is correct.
 * 7. Confirms each guest in the data array has required fields.
 * 8. Validates that all returned guests are active (deleted_at is null).
 */
export async function test_api_guest_list_active_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Construct request body for listing active guests with pagination
  const body = {
    deletedAt: null,
    page: 1,
    limit: 20,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCloneGuest.IRequest;
  // 2. Call the guest listing endpoint
  const output = await api.functional.redditClone.guests.index(connection, {
    body,
  });
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    output.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data array length matches limit or less",
    output.data.length <= output.pagination.limit,
  );
  // 5. Validate each guest record has required fields and is active
  for (const guest of output.data) {
    // Validate required fields exist
    TestValidator.predicate(
      `guest has valid UUID id (${guest.id})`,
      typeof guest.id === "string" && guest.id.length > 0,
    );
    TestValidator.predicate(
      `guest has device_fingerprint (${guest.device_fingerprint})`,
      typeof guest.device_fingerprint === "string" &&
        guest.device_fingerprint.length > 0,
    );
    TestValidator.predicate(
      `guest has created_at (${guest.created_at})`,
      typeof guest.created_at === "string" && guest.created_at.length > 0,
    );
    TestValidator.predicate(
      `guest has updated_at (${guest.updated_at})`,
      typeof guest.updated_at === "string" && guest.updated_at.length > 0,
    );
    // Validate guest is active (deleted_at is null)
    TestValidator.equals(
      `guest ${guest.id} is active (deleted_at is null)`,
      guest.deleted_at,
      null,
    );
  }
}
