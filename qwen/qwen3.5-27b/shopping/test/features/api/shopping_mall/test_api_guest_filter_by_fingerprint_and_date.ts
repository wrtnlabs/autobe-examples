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
 * Test filtering guest accounts by device fingerprint partial match and creation date range.
 *
 * Validates the guest account search functionality with multiple filter criteria including device fingerprint partial matching, creation date range filtering, and deletion status filtering. Ensures that the API correctly combines all filters with AND logic and returns properly sorted results.
 *
 * Special attention is given to verifying that partial device fingerprint matching works as expected (LIKE query behavior), date range boundaries are inclusive, and pagination metadata accurately reflects the filtered result count.
 *
 * 1. Construct filter request with device fingerprint partial match, date range, and active status filter.
 * 2. Call PATCH /shoppingMall/guests endpoint with the filter criteria.
 * 3. Validate response structure and pagination metadata.
 * 4. Verify all returned guests match the device fingerprint partial match criteria.
 * 5. Verify all returned guests were created within the specified date range.
 * 6. Verify all returned guests are active (deleted_at is null).
 * 7. Verify results are sorted by device_fingerprint in ascending order.
 */
export async function test_api_guest_filter_by_fingerprint_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare filter criteria
  const partialFingerprint = RandomGenerator.alphaNumeric(6);
  // Generate date-time range: 60 days ago to now
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const createdAtGte = sixtyDaysAgo.toISOString() as string &
    tags.Format<"date-time">;
  const createdAtLte = now.toISOString() as string & tags.Format<"date-time">;
  const body = {
    device_fingerprint: partialFingerprint,
    created_at_gte: createdAtGte,
    created_at_lte: createdAtLte,
    deleted_at: false,
    page: 1,
    limit: 20,
    sort: "device_fingerprint" as const,
    order: "asc" as const,
  } satisfies IShoppingMallGuest.IRequest;
  // 2. Call the guest search endpoint
  const output = await api.functional.shoppingMall.guests.index(connection, {
    body,
  });
  typia.assert(output);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  // 4. Validate filtered results
  for (let i = 0; i < output.data.length; i++) {
    const guest = output.data[i];
    // Verify device fingerprint contains partial match string
    TestValidator.predicate(
      `guest ${i} device_fingerprint contains partial match`,
      guest.device_fingerprint.includes(partialFingerprint),
    );
    // Verify created_at is within date range (inclusive)
    const guestCreatedAt = new Date(guest.created_at);
    TestValidator.predicate(
      `guest ${i} created_at is >= ${createdAtGte}`,
      guestCreatedAt >= sixtyDaysAgo,
    );
    TestValidator.predicate(
      `guest ${i} created_at is <= ${createdAtLte}`,
      guestCreatedAt <= now,
    );
    // Verify guest is active (deleted_at is null)
    TestValidator.equals(
      `guest ${i} deleted_at is null (active)`,
      guest.deleted_at,
      null,
    );
  }
  // 5. Verify sorting order (device_fingerprint ascending)
  if (output.data.length > 1) {
    for (let i = 1; i < output.data.length; i++) {
      TestValidator.predicate(
        `guest ${i - 1} device_fingerprint <= guest ${i} device_fingerprint`,
        output.data[i - 1].device_fingerprint <=
          output.data[i].device_fingerprint,
      );
    }
  }
  // 6. Test edge case: empty results with non-matching fingerprint
  const emptyBody = {
    device_fingerprint: "xyz_nonexistent_fingerprint_12345",
    created_at_gte: createdAtGte,
    created_at_lte: createdAtLte,
    deleted_at: false,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGuest.IRequest;
  const emptyOutput = await api.functional.shoppingMall.guests.index(
    connection,
    { body: emptyBody },
  );
  typia.assert(emptyOutput);
  TestValidator.equals(
    "empty result has records=0",
    emptyOutput.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has pages=0",
    emptyOutput.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyOutput.data.length,
    0,
  );
}
