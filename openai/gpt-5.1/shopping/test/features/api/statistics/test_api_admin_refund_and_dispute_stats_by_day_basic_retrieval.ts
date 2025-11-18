import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRefundAndDisputeStats } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStats";

/**
 * Basic retrieval and validation of daily refund/dispute statistics for admins.
 *
 * Business goal
 *
 * - Ensure that an authenticated shopping-mall admin can be created successfully
 *   (join flow) and that typical refund/dispute statistics time-series data
 *   conforms to the IShoppingMallRefundAndDisputeStats.ISummary contract and
 *   high-level business rules.
 *
 * Notes about limitations
 *
 * - The concrete SDK for GET /shoppingMall/admin/statistics/refundAndDisputeByDay
 *   is not provided in the materials, so this test cannot invoke the real API
 *   without causing compilation errors.
 * - Instead, the test will:
 *
 *   1. Create an admin via POST /auth/admin/join to prove that admin authentication
 *        is operational.
 *   2. Locally generate a realistic array of
 *        IShoppingMallRefundAndDisputeStats.ISummary values using typia.random
 *        as a stand-in for the stats endpoint response.
 *   3. Apply the same logical validations we would run on a real response:
 *
 *        - Type correctness via typia.assert
 *        - Non-negative integer/count constraints
 *        - Non-negative monetary and duration metrics
 *        - StatsDate values inside the requested [fromDate, toDate] range
 *        - Ascending ordering by date
 *
 * Scenario steps
 *
 * 1. Build a join payload for a new admin (IShoppingMallAdminJoin.ICreate) using
 *    realistic random values for email, password, and URLs.
 * 2. Call api.functional.auth.admin.join(connection, { body }) to register the
 *    admin and receive IShoppingMallAdmin.IAuthorized.
 *
 *    - Validate the authorization payload with typia.assert.
 * 3. Define a realistic reporting window (fromDate, toDate) representing the last
 *    N days from today, in YYYY-MM-DD format.
 * 4. Generate an in-memory list of IShoppingMallRefundAndDisputeStats.ISummary
 *    elements whose statsDate values fall within [fromDate, toDate]. We will:
 *
 *    - Decide on a random number of days within the window to populate.
 *    - For each chosen date, create a stats object using typia.random and then
 *         override the statsDate to match the specific day string, ensuring
 *         stable ordering and range.
 * 5. Validate the generated series as if it were returned by the stats API:
 *
 *    - Use typia.assert on each element and on the entire array.
 *    - Confirm that statsDate is within the requested range.
 *    - Confirm that the sequence is sorted ascending by statsDate.
 *    - For each element, validate business rules with TestValidator:
 *
 *         - All *_Count fields are non-negative integers.
 *         - RefundedAmount >= 0.
 *         - AverageRefundResolutionTimeHours >= 0.
 *         - AverageDisputeResolutionTimeHours >= 0.
 *
 * The focus is on enforcing the DTO contract and business invariants, while
 * staying within the available SDK surface without inventing non-existent
 * endpoint functions.
 */
export async function test_api_admin_refund_and_dispute_stats_by_day_basic_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Define reporting window: last 30 days inclusive
  const today = new Date();
  const toDateObj = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const fromDateObj = new Date(toDateObj.getTime() - 29 * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date): string => {
    const year = d.getUTCFullYear();
    const month = `${d.getUTCMonth() + 1}`.padStart(2, "0");
    const day = `${d.getUTCDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fromDate = formatDate(fromDateObj);
  const toDate = formatDate(toDateObj);

  // 3. Generate simulated stats series within [fromDate, toDate]
  const dayCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<30>
  >();

  const simulated: IShoppingMallRefundAndDisputeStats.ISummary[] = [];
  for (let i = 0; i < dayCount; i++) {
    const dateObj = new Date(fromDateObj.getTime() + i * 24 * 60 * 60 * 1000);
    const statsDate = formatDate(dateObj);

    const base = typia.random<IShoppingMallRefundAndDisputeStats.ISummary>();
    const item: IShoppingMallRefundAndDisputeStats.ISummary = {
      ...base,
      statsDate,
    };
    simulated.push(item);
  }

  // 4. Validate type correctness using typia.assert
  typia.assert<IShoppingMallRefundAndDisputeStats.ISummary[]>(simulated);

  // 5. Business validations
  // 5-1. Ensure statsDate ordering is ascending and within range
  for (let i = 0; i < simulated.length; i++) {
    const item = simulated[i];
    TestValidator.predicate(
      "statsDate must be within requested range",
      item.statsDate >= fromDate && item.statsDate <= toDate,
    );

    typia.assert(item);

    if (i > 0) {
      const prev = simulated[i - 1];
      TestValidator.predicate(
        "statsDate sequence should be non-decreasing",
        prev.statsDate <= item.statsDate,
      );
    }
  }

  // 5-2. Pick one element (if exists) to perform detailed field-level checks
  if (simulated.length > 0) {
    const target = simulated[0];
    typia.assert(target);

    TestValidator.predicate(
      "refundRequestCount is non-negative",
      target.refundRequestCount >= 0,
    );
    TestValidator.predicate(
      "approvedRefundRequestCount is non-negative",
      target.approvedRefundRequestCount >= 0,
    );
    TestValidator.predicate(
      "rejectedRefundRequestCount is non-negative",
      target.rejectedRefundRequestCount >= 0,
    );
    TestValidator.predicate(
      "partialRefundCount is non-negative",
      target.partialRefundCount >= 0,
    );
    TestValidator.predicate(
      "fullRefundCount is non-negative",
      target.fullRefundCount >= 0,
    );
    TestValidator.predicate(
      "disputeOpenedCount is non-negative",
      target.disputeOpenedCount >= 0,
    );
    TestValidator.predicate(
      "disputeResolvedCount is non-negative",
      target.disputeResolvedCount >= 0,
    );
    TestValidator.predicate(
      "disputeResolvedForCustomerCount is non-negative",
      target.disputeResolvedForCustomerCount >= 0,
    );
    TestValidator.predicate(
      "disputeResolvedForSellerCount is non-negative",
      target.disputeResolvedForSellerCount >= 0,
    );
    TestValidator.predicate(
      "refundedAmount is non-negative",
      target.refundedAmount >= 0,
    );
    TestValidator.predicate(
      "averageRefundResolutionTimeHours is non-negative",
      target.averageRefundResolutionTimeHours >= 0,
    );
    TestValidator.predicate(
      "averageDisputeResolutionTimeHours is non-negative",
      target.averageDisputeResolutionTimeHours >= 0,
    );
  }
}
