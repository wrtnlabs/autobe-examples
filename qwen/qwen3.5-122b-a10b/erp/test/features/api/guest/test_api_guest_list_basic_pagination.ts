import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the basic paginated listing of guest device records.
 *
 * Validates the primary success path where an administrator retrieves guest accounts with default pagination parameters. The test verifies that the response contains proper pagination metadata (current page, limit, total records, total pages) and that the data array contains guest summary records with expected fields (id, device_fingerprint, created_at, sessions_count). Guest records should be ordered by created_at descending (newest first). The test also validates that empty result sets return proper pagination metadata with zero records.
 *
 * 1. Call guest list API with default pagination parameters
 * 2. Validate pagination metadata structure and calculations
 * 3. Validate data array structure when records exist
 * 4. Verify ordering by created_at descending
 * 5. Test empty result set with non-existent search pattern
 * 6. Test custom pagination parameters
 */
export async function test_api_guest_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic paginated listing with default parameters
  const output: IPageIHrmGuest.ISummary = await api.functional.hrm.guests.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(output);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination.current is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    output.pagination.pages ===
      Math.ceil(output.pagination.records / output.pagination.limit),
  );
  // Validate data array structure when records exist
  if (output.data.length > 0) {
    // Verify first record has all required fields
    const firstGuest = output.data[0];
    TestValidator.predicate(
      "guest has valid id",
      /^[0-9a-f-]{36}$/i.test(firstGuest.id),
    );
    TestValidator.predicate(
      "guest has device_fingerprint",
      firstGuest.device_fingerprint.length > 0,
    );
    TestValidator.predicate(
      "guest has valid created_at",
      !isNaN(Date.parse(firstGuest.created_at)),
    );
    TestValidator.predicate(
      "guest has sessions_count",
      typeof firstGuest.sessions_count === "number",
    );
    // Verify ordering by created_at descending (newest first)
    for (let i = 1; i < output.data.length; i++) {
      const prevDate = Date.parse(output.data[i - 1].created_at);
      const currDate = Date.parse(output.data[i].created_at);
      TestValidator.predicate(
        `record ${i} is older than record ${i - 1}`,
        prevDate >= currDate,
      );
    }
  }
  // Test 2: Empty result set with non-existent device fingerprint pattern
  const emptyOutput: IPageIHrmGuest.ISummary =
    await api.functional.hrm.guests.index(connection, {
      body: {
        search: "nonexistent_device_fingerprint_xyz123",
      },
    });
  typia.assert(emptyOutput);
  // Validate empty result pagination metadata
  TestValidator.equals(
    "empty result has 0 records",
    emptyOutput.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has 0 pages",
    emptyOutput.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyOutput.data.length,
    0,
  );
  // Test 3: Custom pagination parameters
  const customPage = 2;
  const customLimit = 5;
  const customOutput: IPageIHrmGuest.ISummary =
    await api.functional.hrm.guests.index(connection, {
      body: {
        page: customPage,
        limit: customLimit,
      } satisfies IHrmGuest.IRequest,
    });
  typia.assert(customOutput);
  // Validate custom pagination parameters are reflected
  TestValidator.equals(
    "custom page is reflected",
    customOutput.pagination.current,
    customPage,
  );
  TestValidator.equals(
    "custom limit is reflected",
    customOutput.pagination.limit,
    customLimit,
  );
  TestValidator.predicate(
    "data array respects limit",
    customOutput.data.length <= customLimit,
  );
}
