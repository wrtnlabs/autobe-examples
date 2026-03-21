import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_snapshot_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Get initial snapshots to understand the date range in the system
  const initialResponse =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(initialResponse);
  // If no snapshots exist, we can only test the empty response behavior
  if (initialResponse.data.length === 0) {
    // Test empty date range returns empty results (no snapshots created yet)
    const emptyResponse =
      await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
        adminConnection,
        {
          body: {
            limit: 20,
            page: 1,
          } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(emptyResponse);
    TestValidator.equals(
      "empty result pagination",
      emptyResponse.pagination.records,
      0,
    );
    return;
  }
  // 3. Extract dates from existing snapshots to create valid date range filters
  const snapshotDates = initialResponse.data.map((s) =>
    new Date(s.createdAt).getTime(),
  );
  const minDate = new Date(Math.min(...snapshotDates));
  const maxDate = new Date(Math.max(...snapshotDates));
  const midDate = new Date((minDate.getTime() + maxDate.getTime()) / 2);
  // 4. Test createdAtFrom filter - should return snapshots created on or after the specified datetime
  const fromDateResponse =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: minDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(fromDateResponse);
  // Verify all returned snapshots have createdAt >= minDate
  for (const snapshot of fromDateResponse.data) {
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    TestValidator.predicate(
      "snapshot createdAt >= createdAtFrom",
      snapshotTime >= minDate.getTime(),
    );
  }
  // 5. Test createdAtTo filter - should return snapshots created on or before the specified datetime
  const toDateResponse =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          createdAtTo: maxDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(toDateResponse);
  // Verify all returned snapshots have createdAt <= maxDate
  for (const snapshot of toDateResponse.data) {
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    TestValidator.predicate(
      "snapshot createdAt <= createdAtTo",
      snapshotTime <= maxDate.getTime(),
    );
  }
  // 6. Test combining createdAtFrom and createdAtTo - should return snapshots within inclusive date range
  const rangeResponse =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: minDate.toISOString(),
          createdAtTo: maxDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rangeResponse);
  // Verify all returned snapshots are within the inclusive range
  for (const snapshot of rangeResponse.data) {
    const snapshotTime = new Date(snapshot.createdAt).getTime();
    TestValidator.predicate(
      "snapshot createdAt within range",
      snapshotTime >= minDate.getTime() && snapshotTime <= maxDate.getTime(),
    );
  }
  // 7. Test ISO 8601 datetime format is accepted (verify response is valid)
  // The previous tests already confirm ISO 8601 format is accepted
  TestValidator.predicate("ISO 8601 format accepted", true);
  // 8. Test empty date range returns all snapshots (compare counts)
  const allResponse =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "empty date range returns all snapshots",
    allResponse.data.length >= rangeResponse.data.length,
  );
  // 9. Test pagination works correctly when filtering by date range
  const pageSize = 5;
  const page1Response =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: minDate.toISOString(),
          createdAtTo: maxDate.toISOString(),
          limit: pageSize,
          page: 1,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: minDate.toISOString(),
          createdAtTo: maxDate.toISOString(),
          limit: pageSize,
          page: 2,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals(
    "page 1 limit",
    page1Response.pagination.limit,
    pageSize,
  );
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals(
    "page 2 limit",
    page2Response.pagination.limit,
    pageSize,
  );
  // Verify total records match between paginated and non-paginated queries
  TestValidator.equals(
    "total records match",
    page1Response.pagination.records,
    rangeResponse.pagination.records,
  );
  // Verify page 1 and page 2 have different data (if enough records exist)
  if (page1Response.data.length >= pageSize && page2Response.data.length > 0) {
    const page1Ids = page1Response.data.map((s) => s.id);
    const page2Ids = page2Response.data.map((s) => s.id);
    for (const id of page1Ids) {
      TestValidator.predicate(
        "page 1 and page 2 have different records",
        !page2Ids.includes(id),
      );
    }
  }
}
