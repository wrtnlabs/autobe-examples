import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test listing active guest accounts on the shopping mall platform.
 *
 * Validates the guest listing endpoint with pagination and deletion status filtering. Ensures that only active guests (deleted_at=null) are returned when filtering by deletion status, and that pagination metadata is correctly calculated.
 *
 * The test verifies response structure, pagination accuracy, and data integrity for guest account summaries.
 *
 * 1. Call PATCH /shoppingMall/guests with pagination parameters and deleted_at=false filter
 * 2. Validate response structure matches IPageIShoppingMallGuest.ISummary schema
 * 3. Verify pagination metadata (current, limit, records, pages)
 * 4. Verify all returned guests have deleted_at=null (active status)
 * 5. Verify guest data contains valid UUIDs, device fingerprints, and timestamps
 */
export async function test_api_guest_list_active_guests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare request with pagination and active guest filter
  const body = {
    page: 1,
    limit: 10,
    deleted_at: false,
    sort: "created_at",
    order: "desc",
  } satisfies IShoppingMallGuest.IRequest;
  // 2. Call API to list active guests
  const output = await api.functional.shoppingMall.guests.index(connection, {
    body,
  });
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page", output.pagination.current, 1);
  TestValidator.equals("limit", output.pagination.limit, 10);
  TestValidator.predicate("has records", output.pagination.records >= 0);
  TestValidator.predicate("pages calculated", output.pagination.pages >= 0);
  // 4. Validate guest data structure
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // 5. Validate each guest in the response
  await ArrayUtil.asyncForEach(output.data, async (guest, index) => {
    typia.assert(guest);
    // Verify guest has valid UUID
    TestValidator.predicate(
      `guest[${index}] has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
    );
    // Verify device fingerprint is non-empty string
    TestValidator.predicate(
      `guest[${index}] has device fingerprint`,
      guest.device_fingerprint.length > 0,
    );
    // Verify timestamps are in ISO 8601 format
    TestValidator.predicate(
      `guest[${index}] created_at is valid`,
      !isNaN(Date.parse(guest.created_at)),
    );
    TestValidator.predicate(
      `guest[${index}] updated_at is valid`,
      !isNaN(Date.parse(guest.updated_at)),
    );
    // Verify guest is active (deleted_at is null)
    TestValidator.equals(`guest[${index}] is active`, guest.deleted_at, null);
  });
}
