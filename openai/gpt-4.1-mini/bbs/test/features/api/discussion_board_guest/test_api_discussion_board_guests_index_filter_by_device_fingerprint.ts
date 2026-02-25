import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving guest users filtered by device fingerprint.
 *
 * This test verifies that filtering by device fingerprint returns only guests
 * with the matching fingerprint. It also checks that pagination metadata
 * accurately reflects filtered results. Sorting by createdAt in descending
 * order is tested by default.
 */
export async function test_api_discussion_board_guests_index_filter_by_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection (assuming admin privileges needed for this endpoint)
  const adminConnection: api.IConnection = { host: connection.host };
  // We first fetch guests without filter to select a valid device fingerprint
  const fullResponse: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.guests.index(adminConnection, {
      body: {},
    });
  typia.assert(fullResponse);
  // If no guests, the test cannot continue meaningfully
  TestValidator.predicate(
    "has guests in full list",
    fullResponse.data.length > 0,
  );
  // Pick a random guest from full list to use its device fingerprint for filtering
  const targetGuest = RandomGenerator.pick(fullResponse.data);
  TestValidator.predicate(
    "target guest has device fingerprint",
    typeof targetGuest.deviceFingerprint === "string" &&
      targetGuest.deviceFingerprint.length > 0,
  );
  // Set filtering body with the chosen device fingerprint
  const filterBody: IDiscussionBoardGuest.IRequest = {
    deviceFingerprint: targetGuest.deviceFingerprint,
    page: 1,
    limit: 50,
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  // Perform filtered query
  const filteredResponse: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.guests.index(adminConnection, {
      body: filterBody,
    });
  typia.assert(filteredResponse);
  // Validate that every returned guest matches the device fingerprint
  for (const guest of filteredResponse.data) {
    TestValidator.equals(
      "each guest device fingerprint",
      guest.deviceFingerprint,
      targetGuest.deviceFingerprint,
    );
  }
  // Validate pagination metadata correctness
  TestValidator.equals(
    "pagination current page",
    filteredResponse.pagination.current,
    filterBody.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    filteredResponse.pagination.limit,
    filterBody.limit ?? 20,
  );
  // Verify sorting order (descending) by createdAt
  for (let i = 1; i < filteredResponse.data.length; ++i) {
    const prevDate = new Date(filteredResponse.data[i - 1].createdAt).getTime();
    const currDate = new Date(filteredResponse.data[i].createdAt).getTime();
    TestValidator.predicate(
      `guest createdAt at index ${i - 1} >= index ${i}`,
      prevDate >= currDate,
    );
  }
}
