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

export async function test_api_discussion_board_guests_index_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a filter object that is very unlikely to match any guest record
  const body: IDiscussionBoardGuest.IRequest = {
    deviceFingerprint: "nonexistent-device-fingerprint-xyz-123",
    userAgent: "nonexistent-user-agent-xyz-123",
    ipAddress: "0.0.0.0",
    anonymousId: "nonexistent-anonymous-id-xyz-123",
    // Use a date range in future so no records can exist
    createdAtFrom: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day in future
    createdAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days in future
    updatedAtFrom: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    updatedAtTo: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  // Call the API using a separate connection copy
  const adminConnection: api.IConnection = { host: connection.host };
  const output = await api.functional.discussionBoard.guests.index(
    adminConnection,
    {
      body,
    },
  );
  typia.assert(output);
  // Validate that the data array is empty
  TestValidator.equals("no results data array is empty", output.data.length, 0);
  // Validate pagination that records, pages are zero, current is 1, limit is 10
  TestValidator.equals(
    "pagination current page is 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 10", output.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count is zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is zero",
    output.pagination.pages,
    0,
  );
}
