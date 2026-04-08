import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest list pagination with default parameters.
 *
 * Validates the basic guest listing functionality with default pagination settings. Ensures that the endpoint returns a properly structured paginated response with correct metadata and guest summary data.
 *
 * Verifies pagination metadata consistency including current page, limit, total records, and total pages calculation. Each guest record is validated for required fields: id (UUID format), device_fingerprint (string), and created_at (ISO date-time format).
 *
 * Confirms that results are sorted by created_at in descending order by default, with most recent guests appearing first in the list.
 *
 * 1. Call guest list endpoint with default pagination parameters.
 * 2. Validate response structure using typia.assert().
 * 3. Verify pagination metadata: current page is 1, limit is within valid range.
 * 4. Validate pagination consistency: pages equals ceil(records/limit).
 * 5. Verify data array length does not exceed limit.
 * 6. Validate each guest record has non-empty device_fingerprint.
 * 7. Verify descending order by created_at (most recent first).
 */
export async function test_api_guest_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call guest list endpoint with default pagination
  const result: IPageIRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.guests.index(connection, {
      body: {} satisfies IRedditCommunityGuest.IRequest,
    });
  typia.assert(result);
  // 2. Validate pagination metadata
  const { pagination, data } = result;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("limit is within max", pagination.limit <= 100);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // 3. Validate pagination consistency
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;
  TestValidator.equals("pages calculation", pagination.pages, expectedPages);
  // 4. Validate data array length
  TestValidator.predicate(
    "data length within limit",
    data.length <= pagination.limit,
  );
  // 5. Validate each guest record has non-empty device_fingerprint
  for (const guest of data) {
    TestValidator.predicate(
      "device_fingerprint is non-empty",
      guest.device_fingerprint.length > 0,
    );
  }
  // 6. Verify descending order by created_at (most recent first)
  if (data.length > 1) {
    for (let i = 0; i < data.length - 1; i++) {
      const currentDate = new Date(data[i].created_at).getTime();
      const nextDate = new Date(data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `guest ${i} created_at >= guest ${i + 1} created_at (desc order)`,
        currentDate >= nextDate,
      );
    }
  }
}
