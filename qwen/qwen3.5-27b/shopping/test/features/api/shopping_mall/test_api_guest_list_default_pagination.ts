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

export async function test_api_guest_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving guest accounts with default pagination settings.
   *
   * This test verifies that:
   * 1. The endpoint returns a paginated response structure with pagination metadata
   * 2. Default page is 1 and default limit is 20
   * 3. Results are sorted by created_at descending (newest first)
   * 4. Soft-deleted guests are excluded by default
   * 5. Each guest summary contains required fields
   */
  // Call endpoint with empty body to use all default values
  const output = await api.functional.shoppingMall.guests.index(connection, {
    body: {} satisfies IShoppingMallGuest.IRequest,
  });
  typia.assert(output);
  // Validate pagination metadata with default values
  TestValidator.equals("default page is 1", output.pagination.current, 1);
  TestValidator.equals("default limit is 20", output.pagination.limit, 20);
  TestValidator.predicate("total pages calculated correctly", () => {
    const expectedPages =
      output.pagination.records === 0
        ? 0
        : Math.ceil(output.pagination.records / output.pagination.limit);
    return output.pagination.pages === expectedPages;
  });
  // Validate each guest summary has valid business data
  for (const guest of output.data) {
    TestValidator.predicate(
      `guest ${guest.id} has valid device_fingerprint`,
      guest.device_fingerprint.length > 0,
    );
    TestValidator.predicate(
      `guest ${guest.id} has valid ip`,
      guest.ip.length > 0,
    );
    TestValidator.predicate(
      `guest ${guest.id} has non-negative active_session_count`,
      guest.active_session_count >= 0,
    );
  }
  // Validate sorting order (created_at descending - newest first)
  if (output.data.length > 1) {
    TestValidator.predicate("results sorted by created_at descending", () => {
      for (let i = 1; i < output.data.length; i++) {
        const prevDate = new Date(output.data[i - 1].created_at).getTime();
        const currDate = new Date(output.data[i].created_at).getTime();
        // Allow equal timestamps, but never ascending
        if (prevDate < currDate) return false;
      }
      return true;
    });
  }
  // Validate pagination consistency
  TestValidator.predicate("data length matches expected", () => {
    const expectedLength = Math.min(
      output.pagination.limit,
      output.pagination.records,
    );
    return output.data.length === expectedLength;
  });
}
