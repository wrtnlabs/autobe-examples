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

export async function test_api_guest_sessions_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination with default values
  const defaultResponse = await api.functional.discussionBoard.guests.index(
    connection,
    { body: {} satisfies IDiscussionBoardGuest.IRequest },
  );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(defaultResponse.data),
  );
  // Test 2: Custom pagination parameters
  const customResponse = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        page: 2,
        limit: 50,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom page is 2",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit is 50",
    customResponse.pagination.limit,
    50,
  );
  // Test 3: Date range filter with createdAtFrom
  const startDate = new Date().toISOString();
  const createdAtFromResponse =
    await api.functional.discussionBoard.guests.index(connection, {
      body: {
        createdAtFrom: startDate,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(createdAtFromResponse);
  // Test 4: Date range filter with createdAtTo
  const endDate = new Date().toISOString();
  const createdAtToResponse = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        createdAtTo: endDate,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(createdAtToResponse);
  // Test 5: Combined date range filters
  const combinedFilterResponse =
    await api.functional.discussionBoard.guests.index(connection, {
      body: {
        createdAtFrom: startDate,
        createdAtTo: endDate,
        updatedAtFrom: startDate,
        updatedAtTo: endDate,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter page is 1",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit is 10",
    combinedFilterResponse.pagination.limit,
    10,
  );
  // Test 6: Validate guest session summary structure
  if (combinedFilterResponse.data.length > 0) {
    const guestSession = combinedFilterResponse.data[0];
    TestValidator.predicate(
      "has valid id",
      /^[0-9a-f-]{36}$/i.test(guestSession.id),
    );
    TestValidator.predicate(
      "has valid IP address",
      /^(\d{1,3}\.){3}\d{1,3}$/.test(guestSession.ip_address),
    );
    TestValidator.predicate(
      "has device fingerprint",
      guestSession.device_fingerprint.length > 0,
    );
    TestValidator.predicate(
      "has valid created_at",
      !isNaN(Date.parse(guestSession.created_at)),
    );
  }
  // Test 7: Pagination metadata validation
  const pagination = combinedFilterResponse.pagination;
  TestValidator.predicate("current >= 0", pagination.current >= 0);
  TestValidator.predicate("limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // Test 8: Boundary values for pagination
  const boundaryResponse = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1, // minimum
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(boundaryResponse);
  const maxLimitResponse = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // maximum
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
}
