import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshots_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Create a refund request - this creates initial "created" snapshot
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          evidence_description: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(refundRequest);
  const createdSnapshotAt = refundRequest.createdAt;
  // Small delay to ensure distinct timestamps for sorting
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Seller approves the refund request - creates "approved" snapshot
  const approvedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action: "approve",
        },
      },
    );
  typia.assert(approvedRequest);
  // 5. Test action_type filter - only approved snapshots
  const approvedSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action_type: "approved",
          limit: 100,
        },
      },
    );
  typia.assert(approvedSnapshots);
  TestValidator.equals(
    "approved filter returns only approved snapshots",
    approvedSnapshots.data.every((s) => s.actionType === "approved") ? 1 : 0,
    approvedSnapshots.data.length,
  );
  // 6. Test date range filtering
  const afterDate = new Date(Date.parse(createdSnapshotAt)).toISOString();
  const beforeDate = new Date(Date.now()).toISOString();
  const dateFilteredSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          created_at_after: afterDate,
          created_at_before: beforeDate,
          limit: 100,
        },
      },
    );
  typia.assert(dateFilteredSnapshots);
  TestValidator.predicate(
    "date range filter returns snapshots within range",
    dateFilteredSnapshots.data.every(
      (s) => s.createdAt >= afterDate && s.createdAt <= beforeDate,
    ),
  );
  // 7. Test status_before filter
  const statusBeforeSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status_before: "pending",
          limit: 100,
        },
      },
    );
  typia.assert(statusBeforeSnapshots);
  TestValidator.equals(
    "status_before filter returns correct snapshots",
    statusBeforeSnapshots.data.every((s) => s.statusBefore === "pending")
      ? true
      : false,
    true,
  );
  // 8. Test sorting by created_at ASC
  const ascSortedSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          sort_by: "created_at",
          sort_order: "ASC",
          limit: 100,
        },
      },
    );
  typia.assert(ascSortedSnapshots);
  const ascTimes = ascSortedSnapshots.data.map((s) => s.createdAt);
  TestValidator.predicate(
    "created_at ASC sorting is correct",
    ascTimes.every((time, i) => i === 0 || time >= ascTimes[i - 1]),
  );
  // 9. Test sorting by created_at DESC
  const descSortedSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          sort_by: "created_at",
          sort_order: "DESC",
          limit: 100,
        },
      },
    );
  typia.assert(descSortedSnapshots);
  const descTimes = descSortedSnapshots.data.map((s) => s.createdAt);
  TestValidator.predicate(
    "created_at DESC sorting is correct",
    descTimes.every((time, i) => i === 0 || time <= descTimes[i - 1]),
  );
  // 10. Test cursor-based pagination
  const firstPage =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          limit: 2,
        },
      },
    );
  typia.assert(firstPage);
  if (firstPage.data.length > 0) {
    const cursor = firstPage.data[firstPage.data.length - 1].createdAt;
    const secondPage =
      await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
        sellerConnection,
        {
          refundRequestId: refundRequest.id,
          body: {
            cursor: cursor,
            limit: 2,
          },
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "cursor pagination returns next page",
      secondPage.data.length,
      2,
    );
  }
  // 11. Test page-based pagination
  const pageOne =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(pageOne);
  TestValidator.equals("page 1 exists", pageOne.pagination.current, 1);
  const pageTwo =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals("page 2 exists", pageTwo.pagination.current, 2);
  // 12. Test limit parameter
  const limitedSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          limit: 3,
        },
      },
    );
  typia.assert(limitedSnapshots);
  TestValidator.predicate(
    "limit parameter correctly limits results",
    limitedSnapshots.data.length <= 3,
  );
  // 13. Test combined filters
  const combinedFilteredSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action_type: "approved",
          status_before: "pending",
          limit: 100,
        },
      },
    );
  typia.assert(combinedFilteredSnapshots);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilteredSnapshots.data.every(
      (s) => s.actionType === "approved" && s.statusBefore === "pending",
    ),
  );
  // 14. Test empty results
  const nonExistentSnapshotAt = new Date("2020-01-01T00:00:00Z").toISOString();
  const emptyFilteredSnapshots =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          created_at_before: nonExistentSnapshotAt,
          limit: 50,
        },
      },
    );
  typia.assert(emptyFilteredSnapshots);
  TestValidator.equals(
    "empty filter returns zero records",
    emptyFilteredSnapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter returns zero pages",
    emptyFilteredSnapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filter returns empty data array",
    emptyFilteredSnapshots.data.length,
    0,
  );
}
