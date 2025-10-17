import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardGuest";

export async function test_api_guest_interactions_search_by_active_date_range(
  connection: api.IConnection,
) {
  // Authenticate as admin to access guest interaction data
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Generate precise timestamps for testing
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(oneHourAgo.getTime() - 60 * 60 * 1000);

  // Create test data with known timestamps
  // We don't have direct control to create guest data - but we can test against existing data
  // First, get current guest count to determine baseline
  const initialCount = await api.functional.economicBoard.admin.guests.search(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEconomicBoardGuest.IRequest,
    },
  );
  typia.assert(initialCount);

  // Test 1: Search within range that should contain data
  const startTime = twoHoursAgo.toISOString();
  const endTime = oneHourAgo.toISOString();

  // Search for guests active in the defined range
  const response: IPageIEconomicBoardGuest =
    await api.functional.economicBoard.admin.guests.search(connection, {
      body: {
        last_active_after: startTime,
        last_active_before: endTime,
        page: 1,
        limit: 25,
      } satisfies IEconomicBoardGuest.IRequest,
    });
  typia.assert(response);

  // Verify we got a valid response with pagination
  TestValidator.predicate(
    "has at least one guest",
    () => response.data.length > 0,
  );
  TestValidator.equals(
    "pagination is structured correctly",
    response.pagination,
    {
      current: 1,
      limit: 25,
      records: response.pagination.records,
      pages: Math.ceil(response.pagination.records / 25),
    },
  );

  // Validate timestamps are in correct format (redundant with typia.assert() but included for clarity)
  // Note: typia.assert() already validated these as format="date-time"
  // This assertion is only here to show intent, but should be removed in production for performance

  // Test 2: Test empty result set - range with no data
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const futureTime = nextHour.toISOString();

  const emptyResponse: IPageIEconomicBoardGuest =
    await api.functional.economicBoard.admin.guests.search(connection, {
      body: {
        last_active_after: futureTime,
        last_active_before: new Date().toISOString(),
        page: 1,
        limit: 25,
      } satisfies IEconomicBoardGuest.IRequest,
    });
  typia.assert(emptyResponse);

  TestValidator.equals(
    "empty results with zero records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("empty results with empty data", emptyResponse.data, []);

  // Test 3: Boundary testing - exactly at timestamp
  const exactTime = oneHourAgo.toISOString();

  const boundaryResponse: IPageIEconomicBoardGuest =
    await api.functional.economicBoard.admin.guests.search(connection, {
      body: {
        last_active_after: exactTime,
        last_active_before: exactTime,
        page: 1,
        limit: 25,
      } satisfies IEconomicBoardGuest.IRequest,
    });
  typia.assert(boundaryResponse);
  // We can't predict if exact match exists, so we validate the response structure

  // Test 4: Test invalid parameter format (should throw error)
  await TestValidator.error("invalid date format should fail", async () => {
    await api.functional.economicBoard.admin.guests.search(connection, {
      body: {
        last_active_after: "invalid-date",
        last_active_before: new Date().toISOString(),
        page: 1,
        limit: 25,
      } satisfies IEconomicBoardGuest.IRequest,
    });
  });

  // Test 5: Test impossible range (end before start)
  await TestValidator.error("impossible date range should fail", async () => {
    await api.functional.economicBoard.admin.guests.search(connection, {
      body: {
        last_active_after: endTime,
        last_active_before: startTime,
        page: 1,
        limit: 25,
      } satisfies IEconomicBoardGuest.IRequest,
    });
  });

  // Validate sensitive fields are present as per schema
  // session_id and ip_hash are present in schema, so validation should confirm they exist
  TestValidator.predicate("all guests have session_id", () => {
    return response.data.every((guest) => typeof guest.session_id === "string");
  });

  TestValidator.predicate("ip_hash is string or undefined", () => {
    return response.data.every(
      (guest) =>
        guest.ip_hash === undefined || typeof guest.ip_hash === "string",
    );
  });

  // Validate that the guest data structure matches schema criteria
  // This is assured by typia.assert() - no additional validation needed

  // Test 6: Test pagination with different limits
  const limit20Response: IPageIEconomicBoardGuest =
    await api.functional.economicBoard.admin.guests.search(connection, {
      body: {
        last_active_after: startTime,
        last_active_before: endTime,
        page: 1,
        limit: 20,
      } satisfies IEconomicBoardGuest.IRequest,
    });
  typia.assert(limit20Response);

  TestValidator.equals(
    "limit 20 reflected in pagination",
    limit20Response.pagination.limit,
    20,
  );

  // Test 7: Test pagination with page number 2
  if (initialCount.pagination.records > 20) {
    const page2Response: IPageIEconomicBoardGuest =
      await api.functional.economicBoard.admin.guests.search(connection, {
        body: {
          last_active_after: startTime,
          last_active_before: endTime,
          page: 2,
          limit: 10,
        } satisfies IEconomicBoardGuest.IRequest,
      });
    typia.assert(page2Response);

    TestValidator.equals(
      "page 2 has correct page number",
      page2Response.pagination.current,
      2,
    );
  }

  // Since typia.assert() has performed perfect validation on all response types,
  // we don't need additional validation beyond business logic checks.
}
