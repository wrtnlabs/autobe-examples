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
 * Test administrator pagination and sorting capabilities for pending refund request listings.
 * 1. Administrator authenticates via join endpoint
 * 2. Test pagination with different page numbers and limit values
 * 3. Test sorting by requested_at (newest/oldest first)
 * 4. Test sorting by days_since_delivery (urgency-based)
 * 5. Validate pagination metadata accuracy
 * 6. Validate record ordering for each sort configuration
 */
export async function test_api_admin_paginate_and_sort_refund_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test pagination - page 1 with limit 10
  const page1Limit10 =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(page1Limit10);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1Limit10.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Limit10.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has records",
    page1Limit10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has pages",
    page1Limit10.pagination.pages >= 0,
  );
  // 3. Test pagination - page 2 with limit 10
  const page2Limit10 =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(page2Limit10);
  TestValidator.equals("page 2 current", page2Limit10.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Limit10.pagination.limit, 10);
  // 4. Test pagination - page 1 with limit 20
  const page1Limit20 =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(page1Limit20);
  TestValidator.equals(
    "page 1 limit 20 current",
    page1Limit20.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 20 limit",
    page1Limit20.pagination.limit,
    20,
  );
  // 5. Test sorting - requested_at descending (newest first, default)
  const sortByRequestedAtDesc =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          sortBy: "requested_at",
          order: "desc",
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(sortByRequestedAtDesc);
  // Verify descending order (newest first)
  if (sortByRequestedAtDesc.data.length > 1) {
    for (let i = 0; i < sortByRequestedAtDesc.data.length - 1; i++) {
      const current = sortByRequestedAtDesc.data[i];
      const next = sortByRequestedAtDesc.data[i + 1];
      TestValidator.predicate(
        `requested_at descending order at index ${i}`,
        current.requested_at >= next.requested_at,
      );
    }
  }
  // 6. Test sorting - requested_at ascending (oldest first)
  const sortByRequestedAtAsc =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          sortBy: "requested_at",
          order: "asc",
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(sortByRequestedAtAsc);
  // Verify ascending order (oldest first)
  if (sortByRequestedAtAsc.data.length > 1) {
    for (let i = 0; i < sortByRequestedAtAsc.data.length - 1; i++) {
      const current = sortByRequestedAtAsc.data[i];
      const next = sortByRequestedAtAsc.data[i + 1];
      TestValidator.predicate(
        `requested_at ascending order at index ${i}`,
        current.requested_at <= next.requested_at,
      );
    }
  }
  // 7. Test sorting - days_since_delivery descending (oldest requests first)
  const sortByDaysSinceDeliveryDesc =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          sortBy: "days_since_delivery",
          order: "desc",
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(sortByDaysSinceDeliveryDesc);
  // Verify descending order by days_since_delivery
  if (sortByDaysSinceDeliveryDesc.data.length > 1) {
    for (let i = 0; i < sortByDaysSinceDeliveryDesc.data.length - 1; i++) {
      const current = sortByDaysSinceDeliveryDesc.data[i];
      const next = sortByDaysSinceDeliveryDesc.data[i + 1];
      TestValidator.predicate(
        `days_since_delivery descending order at index ${i}`,
        current.days_since_delivery >= next.days_since_delivery,
      );
    }
  }
  // 8. Test sorting - days_since_delivery ascending (newest requests first)
  const sortByDaysSinceDeliveryAsc =
    await api.functional.ecommerceMall.admin.refund_requests.pending.index(
      adminConnection,
      {
        body: {
          sortBy: "days_since_delivery",
          order: "asc",
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(sortByDaysSinceDeliveryAsc);
  // Verify ascending order by days_since_delivery
  if (sortByDaysSinceDeliveryAsc.data.length > 1) {
    for (let i = 0; i < sortByDaysSinceDeliveryAsc.data.length - 1; i++) {
      const current = sortByDaysSinceDeliveryAsc.data[i];
      const next = sortByDaysSinceDeliveryAsc.data[i + 1];
      TestValidator.predicate(
        `days_since_delivery ascending order at index ${i}`,
        current.days_since_delivery <= next.days_since_delivery,
      );
    }
  }
}