import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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

export async function test_api_seller_pending_refund_requests_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
      referrer: typia.random<string & tags.Format<"uri">>() as string &
        tags.Format<"uri">,
    },
  });
  typia.assert(seller);
  // 2. Create multiple customers with orders and refund requests
  const customers: {
    customerConnection: api.IConnection;
    customerId: string;
    email: string;
  }[] = [];
  const refundRequests: {
    orderItemId: string;
    customerEmail: string;
    reason: string;
    unitPrice: number;
    quantity: number;
    submittedAt: string;
  }[] = [];
  // Generate 6 customers with varied attributes
  for (let i = 0; i < 6; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>() as string &
          tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() as string &
          tags.Format<"uri">,
        referrer: typia.random<string & tags.Format<"uri">>() as string &
          tags.Format<"uri">,
      },
    });
    typia.assert(customer);
    customers.push({
      customerConnection,
      customerId: customer.id,
      email: customer.email,
    });
    // Create refund requests with different characteristics
    const isRefund = i < 5; // 5 refunds, 1 no refund
    if (isRefund) {
      const orderItemId = typia.random<
        string & tags.Format<"uuid">
      >() as string & tags.Format<"uuid">;
      const reason =
        i % 2 === 0
          ? ("Product arrived damaged" as const)
          : ("Item not as described" as const);
      const unitPrice = 10000 * (i + 1);
      const quantity = 1 + (i % 3);
      const submittedAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      await generate_random_ecommerce_mall_customer_refund_requests_create(
        customerConnection,
        {
          body: {
            reason,
          },
          params: { orderItemId },
        },
      );
      refundRequests.push({
        orderItemId,
        customerEmail: customer.email,
        reason,
        unitPrice,
        quantity,
        submittedAt,
      });
    }
  }
  // 3. Test filtering with various combinations
  const sellerFilterConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic pending status filter (default - should only return pending)
  const basicFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(basicFilter);
  typia.assert(basicFilter.data);
  basicFilter.data.forEach((request) => {
    TestValidator.equals("all requests are pending", request.status, "pending");
  });
  // Test 2: Customer IDs filter (partial)
  if (refundRequests.length > 0) {
    const partialCustomerIds = customers.slice(0, 2).map((c) => c.customerId);
    const customerFilter =
      await api.functional.ecommerceMall.seller.refund_requests.pending.index(
        sellerFilterConnection,
        {
          body: {
            status: "pending",
            customerIds: partialCustomerIds,
          },
        },
      );
    typia.assert(customerFilter);
    TestValidator.equals(
      "filtered customer count matches",
      customerFilter.data.length,
      partialCustomerIds.length,
    );
    customerFilter.data.forEach((request) => {
      TestValidator.predicate(
        "customer in filter list",
        partialCustomerIds.includes(request.customer.id),
      );
    });
  }
  // Test 3: Reason keywords filter (case-insensitive partial match)
  const reasonFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          reasonKeywords: "damaged",
        },
      },
    );
  typia.assert(reasonFilter);
  reasonFilter.data.forEach((request) => {
    const customer = customers.find(
      (c) => c.customerId === request.customer.id,
    );
    const foundRequest = refundRequests.find(
      (r) => r.customerEmail === customer?.email,
    );
    if (foundRequest) {
      TestValidator.predicate(
        "reason contains keyword",
        foundRequest.reason.toLowerCase().includes("damaged"),
      );
    }
  });
  // Test 4: Date range filter (start and end date)
  const dateFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          startDate: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    );
  typia.assert(dateFilter);
  // Verify all returned requests are within date range
  dateFilter.data.forEach((request) => {
    if (request.submitted_at) {
      const requestDate = new Date(request.submitted_at);
      const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      TestValidator.predicate(
        "submitted_at within date range",
        requestDate >= startDate && requestDate <= endDate,
      );
    }
  });
  // Test 5: Amount range filter
  const amountFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          minAmount: 30000,
          maxAmount: 60000,
        },
      },
    );
  typia.assert(amountFilter);
  // Calculate refund amounts and verify
  amountFilter.data.forEach((request) => {
    const orderItemAmount =
      request.orderItem.unitPrice * request.orderItem.quantity;
    TestValidator.predicate(
      "refund amount in range",
      orderItemAmount >= 30000 && orderItemAmount <= 60000,
    );
  });
  // Test 6: Pagination tests
  // Test page parameter
  const pageFilter1 =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(pageFilter1);
  TestValidator.equals("page 1 has correct limit", pageFilter1.data.length, 2);
  TestValidator.equals("page 1 is correct", pageFilter1.pagination.current, 1);
  const pageFilter2 =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(pageFilter2);
  TestValidator.equals("page 2 is correct", pageFilter2.pagination.current, 2);
  // Test limit parameter
  const limitFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          limit: 1,
        },
      },
    );
  typia.assert(limitFilter);
  TestValidator.equals("limit 1 returns 1 record", limitFilter.data.length, 1);
  // Test 7: Sorting validation
  // Sort by createdAt (submitted_at) descending
  const sortDescFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortDescFilter);
  // Sort by createdAt ascending
  const sortAscFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          sortBy: "createdAt",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortAscFilter);
  // Verify sorting direction is applied (at least different order)
  if (sortDescFilter.data.length > 0 && sortAscFilter.data.length > 0) {
    const descFirst = sortDescFilter.data[0].submitted_at;
    const ascFirst = sortAscFilter.data[0].submitted_at;
    if (descFirst && ascFirst) {
      TestValidator.predicate(
        "sort direction changes order",
        descFirst !== ascFirst,
      );
    }
  }
  // Sort by refundAmount
  const amountSortFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          sortBy: "refundAmount",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(amountSortFilter);
  // Verify refundAmount is calculated correctly
  amountSortFilter.data.forEach((request) => {
    const calculatedAmount =
      request.orderItem.unitPrice * request.orderItem.quantity;
    TestValidator.equals(
      "refund amount calculation",
      calculatedAmount,
      request.orderItem.totalPrice,
    );
  });
  // Test 8: No matches scenario - filter with non-existent customer
  const noMatchFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          customerIds: [
            typia.random<string & tags.Format<"uuid">>() as string &
              tags.Format<"uuid">,
          ],
        },
      },
    );
  typia.assert(noMatchFilter);
  TestValidator.equals(
    "no matches returns empty data",
    noMatchFilter.data.length,
    0,
  );
  TestValidator.equals(
    "no matches has 0 records",
    noMatchFilter.pagination.records,
    0,
  );
  // Test 9: Total count accuracy
  const totalCountFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        },
      },
    );
  typia.assert(totalCountFilter);
  TestValidator.equals(
    "total records count is accurate",
    totalCountFilter.pagination.records,
    totalCountFilter.data.length,
  );
  // Test 10: Pages count calculation
  const pagesFilter =
    await api.functional.ecommerceMall.seller.refund_requests.pending.index(
      sellerFilterConnection,
      {
        body: {
          status: "pending",
          limit: 3,
        },
      },
    );
  typia.assert(pagesFilter);
  const expectedPages = Math.ceil(
    pagesFilter.pagination.records / pagesFilter.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    pagesFilter.pagination.pages,
    expectedPages,
  );
}
