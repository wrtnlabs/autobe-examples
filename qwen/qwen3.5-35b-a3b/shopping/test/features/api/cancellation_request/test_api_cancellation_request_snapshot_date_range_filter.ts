import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register administrator to access cancellation request snapshot endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(admin);
  // Test 1: created_at_range filter - retrieve snapshots within specific date range
  const now = new Date();
  const week3ago = new Date(now.getTime() - 3 * 7 * 24 * 60 * 60 * 1000);
  const week10ago = new Date(now.getTime() - 10 * 7 * 24 * 60 * 60 * 1000);
  const createdInRange: IDateRange = {
    gte: week3ago.toISOString(),
    lte: now.toISOString(),
  } satisfies IDateRange;
  const createdRangeResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_range: createdInRange,
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(createdRangeResponse);
  // Validate: All returned snapshots should have created_at within range (inclusive)
  for (const snapshot of createdRangeResponse.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at in range`,
      snapshot.created_at >= week3ago.toISOString() &&
        snapshot.created_at <= now.toISOString(),
    );
  }
  // Test 2: approved_at_range filter - retrieve snapshots approved within specific range
  const approvedInRange: IDateRange = {
    gte: week10ago.toISOString(),
    lte: now.toISOString(),
  } satisfies IDateRange;
  const approvedRangeResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          approved_at_range: approvedInRange,
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedRangeResponse);
  // Validate: All returned snapshots should have non-null approved_at within range
  for (const snapshot of approvedRangeResponse.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} has non-null approved_at in range`,
      snapshot.approved_at !== null &&
        snapshot.approved_at !== undefined &&
        snapshot.approved_at >= week10ago.toISOString() &&
        snapshot.approved_at <= now.toISOString(),
    );
  }
  // Test 3: rejected_at_range filter - retrieve snapshots rejected within specific range
  const rejectedInRange: IDateRange = {
    gte: week10ago.toISOString(),
    lte: now.toISOString(),
  } satisfies IDateRange;
  const rejectedRangeResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          rejected_at_range: rejectedInRange,
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedRangeResponse);
  // Validate: All returned snapshots should have non-null rejected_at within range
  for (const snapshot of rejectedRangeResponse.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} has non-null rejected_at in range`,
      snapshot.rejected_at !== null &&
        snapshot.rejected_at !== undefined &&
        snapshot.rejected_at >= week10ago.toISOString() &&
        snapshot.rejected_at <= now.toISOString(),
    );
  }
  // Test 4: Combine multiple date range filters
  const combinedResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_range: createdInRange,
          approved_at_range: approvedInRange,
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate: All returned snapshots should match BOTH date range conditions
  for (const snapshot of combinedResponse.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} matches both date ranges`,
      snapshot.created_at >= week3ago.toISOString() &&
        snapshot.created_at <= now.toISOString() &&
        snapshot.approved_at !== null &&
        snapshot.approved_at !== undefined &&
        snapshot.approved_at >= week10ago.toISOString() &&
        snapshot.approved_at <= now.toISOString(),
    );
  }
  // Test 5: Edge case - gte > lte should return empty results
  const invalidRange: IDateRange = {
    gte: now.toISOString(),
    lte: week10ago.toISOString(),
  } satisfies IDateRange;
  const invalidRangeResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_range: invalidRange,
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(invalidRangeResponse);
  // Validate: Should return empty array when gte > lte
  TestValidator.equals(
    "invalid range returns empty results",
    invalidRangeResponse.data.length,
    0,
  );
  // Test 6: Verify pagination works with date range filters
  const paginationResponse: IPageIEcommerceMallCancellationRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          created_at_range: createdInRange,
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    5,
  );
  // Verify cursor exists for next page if more records available (removed - cursor field doesn't exist on IPagination)
}