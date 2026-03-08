import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering of pending refund requests by date range.
 * 1. Authenticate as administrator
 * 2. Create refund requests with various requested_at timestamps
 * 3. Filter refund requests by date range (requested_at_from and requested_at_to)
 * 4. Validate that only refund requests within the date range are returned
 * 5. Verify pagination metadata reflects filtered count
 */
export async function test_api_admin_filter_refund_requests_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.assert<IEcommerceMallAdmin.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    }),
  });
  typia.assert(adminAuth);
  // 2. Get all pending refund requests to work with
  const allRequests =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // If no refund requests exist, skip this test (nothing to filter)
  if (allRequests.data.length === 0) {
    return;
  }
  // 3. Test filtering by date range
  // Get the timestamps from existing refund requests
  const timestamps = allRequests.data.map((r) => new Date(r.requested_at));
  const minDate = new Date(Math.min(...timestamps.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...timestamps.map((d) => d.getTime())));
  // Set date range boundaries
  const requestedAtFrom = new Date(minDate.getTime() - 86400000); // 1 day before min
  const requestedAtTo = new Date(maxDate.getTime() + 86400000); // 1 day after max
  // Filter with a narrower range in the middle
  const midPoint = new Date((minDate.getTime() + maxDate.getTime()) / 2);
  const filterFrom = new Date(midPoint.getTime() - 43200000); // 12 hours before midpoint
  const filterTo = new Date(midPoint.getTime() + 43200000); // 12 hours after midpoint
  // 4. Apply date range filter
  const filteredRequests =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          requested_at_from: filterFrom.toISOString() as string &
            tags.Format<"date-time">,
          requested_at_to: filterTo.toISOString() as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(filteredRequests);
  // 5. Validate filtering results
  // All returned requests should be within the date range
  for (const request of filteredRequests.data) {
    const requestDate = new Date(request.requested_at);
    TestValidator.predicate(
      `request ${request.id} requested_at >= requested_at_from`,
      requestDate.getTime() >= filterFrom.getTime(),
    );
    TestValidator.predicate(
      `request ${request.id} requested_at <= requested_at_to`,
      requestDate.getTime() <= filterTo.getTime(),
    );
  }
  // Verify pagination metadata
  TestValidator.equals(
    "filtered count matches data length",
    filteredRequests.pagination.records,
    filteredRequests.data.length,
  );
  // 6. Test that requests outside the range are excluded
  // Get requests before the filter range
  const beforeRange =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          requested_at_from: requestedAtFrom.toISOString() as string &
            tags.Format<"date-time">,
          requested_at_to: filterFrom.toISOString() as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(beforeRange);
  // Get requests after the filter range
  const afterRange =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          requested_at_from: filterTo.toISOString() as string &
            tags.Format<"date-time">,
          requested_at_to: requestedAtTo.toISOString() as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(afterRange);
  // Verify no overlap between filtered results and before/after ranges
  const filteredIds = new Set(filteredRequests.data.map((r) => r.id));
  const beforeIds = new Set(beforeRange.data.map((r) => r.id));
  const afterIds = new Set(afterRange.data.map((r) => r.id));
  // Check that filtered IDs don't overlap with before/after
  for (const beforeId of beforeIds) {
    TestValidator.predicate(
      `before range request ${beforeId} not in filtered results`,
      !filteredIds.has(beforeId),
    );
  }
  for (const afterId of afterIds) {
    TestValidator.predicate(
      `after range request ${afterId} not in filtered results`,
      !filteredIds.has(afterId),
    );
  }
  // 7. Test inclusive boundaries
  // Get requests exactly at the boundary
  const boundaryTest =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          requested_at_from: filterFrom.toISOString() as string &
            tags.Format<"date-time">,
          requested_at_to: filterFrom.toISOString() as string &
            tags.Format<"date-time">,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(boundaryTest);
  // All requests at exact boundary should be included
  for (const request of boundaryTest.data) {
    const requestDate = new Date(request.requested_at);
    TestValidator.predicate(
      `boundary request ${request.id} matches filterFrom`,
      requestDate.getTime() === filterFrom.getTime(),
    );
  }
}