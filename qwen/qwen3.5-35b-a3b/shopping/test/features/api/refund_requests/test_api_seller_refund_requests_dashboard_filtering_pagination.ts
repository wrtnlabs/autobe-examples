import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller refund request dashboard filtering and pagination functionality.
 * Validates status filtering, cursor-based pagination, time limit calculation,
 * and order item detail inclusion for seller refund dashboard.
 */
export async function test_api_seller_refund_requests_dashboard_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(seller);
  // Create connection with seller token for authenticated requests
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${seller.token.access}` },
  };
  // Test 1: Get all refund requests (no filters)
  const allRefunds =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRefunds);
  // Verify pagination metadata for all refunds
  TestValidator.equals(
    "all refunds pagination records",
    allRefunds.pagination.records,
    6,
  );
  TestValidator.equals(
    "all refunds pagination limit",
    allRefunds.pagination.limit,
    20,
  );
  TestValidator.equals(
    "all refunds pagination pages",
    allRefunds.pagination.pages,
    1,
  );
  TestValidator.equals(
    "all refunds pagination current",
    allRefunds.pagination.current,
    1,
  );
  // Test 2: Filter by pending status
  const pendingRefunds =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          request_status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRefunds);
  TestValidator.equals(
    "pending refunds count",
    pendingRefunds.pagination.records,
    3,
  );
  TestValidator.equals(
    "pending refunds data length",
    pendingRefunds.data.length,
    3,
  );
  // Verify all pending refunds have correct status
  for (const refund of pendingRefunds.data) {
    typia.assert(refund);
    TestValidator.equals(
      `pending refund ${refund.id} status`,
      refund.request_status,
      "pending",
    );
  }
  // Test 3: Filter by approved status
  const approvedRefunds =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          request_status: "approved",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedRefunds);
  TestValidator.equals(
    "approved refunds count",
    approvedRefunds.pagination.records,
    2,
  );
  TestValidator.equals(
    "approved refunds data length",
    approvedRefunds.data.length,
    2,
  );
  // Verify all approved refunds have correct status
  for (const refund of approvedRefunds.data) {
    typia.assert(refund);
    TestValidator.equals(
      `approved refund ${refund.id} status`,
      refund.request_status,
      "approved",
    );
  }
  // Test 4: Filter by rejected status
  const rejectedRefunds =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          request_status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRefunds);
  TestValidator.equals(
    "rejected refunds count",
    rejectedRefunds.pagination.records,
    1,
  );
  TestValidator.equals(
    "rejected refunds data length",
    rejectedRefunds.data.length,
    1,
  );
  // Verify rejected refund has correct status
  for (const refund of rejectedRefunds.data) {
    typia.assert(refund);
    TestValidator.equals(
      `rejected refund ${refund.id} status`,
      refund.request_status,
      "rejected",
    );
  }
  // Test 5: Pagination with limit=3
  const paginatedRefunds =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          limit: 3,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedRefunds);
  TestValidator.equals("paginated limit", paginatedRefunds.pagination.limit, 3);
  TestValidator.equals(
    "paginated records",
    paginatedRefunds.pagination.records,
    6,
  );
  TestValidator.equals("paginated pages", paginatedRefunds.pagination.pages, 2);
  TestValidator.equals(
    "paginated current",
    paginatedRefunds.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated data length",
    paginatedRefunds.data.length,
    3,
  );
  // Test 6: Fetch next page (page=2)
  const nextPage =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          limit: 3,
          page: 2,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(nextPage);
  TestValidator.equals("next page limit", nextPage.pagination.limit, 3);
  TestValidator.equals("next page records", nextPage.pagination.records, 6);
  TestValidator.equals("next page pages", nextPage.pagination.pages, 2);
  TestValidator.equals("next page current", nextPage.pagination.current, 2);
  TestValidator.equals("next page data length", nextPage.data.length, 3);
  // Test 7: Verify pagination metadata accuracy
  const expectedPages = Math.ceil(
    paginatedRefunds.pagination.records / paginatedRefunds.pagination.limit,
  );
  TestValidator.equals(
    "expected pages calculation",
    paginatedRefunds.pagination.pages,
    expectedPages,
  );
  // Test 8: Verify orderItem details for each refund
  for (const refund of allRefunds.data) {
    typia.assert(refund);
    typia.assert(refund.orderItem);
    typia.assert(refund.orderItem.order);
    // Verify orderItem has required fields
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has order reference`,
      refund.orderItem.order.id !== undefined,
      true,
    );
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has quantity`,
      refund.orderItem.quantity >= 1,
      true,
    );
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has unitPrice`,
      refund.orderItem.unitPrice !== undefined,
      true,
    );
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has itemStatus`,
      refund.orderItem.itemStatus !== undefined,
      true,
    );
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has productSnapshot`,
      refund.orderItem.productSnapshot !== undefined,
      true,
    );
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has variantSnapshot`,
      refund.orderItem.variantSnapshot !== undefined,
      true,
    );
    TestValidator.equals(
      `orderItem ${refund.orderItem.id} has sellerProfileSnapshot`,
      refund.orderItem.sellerProfileSnapshot !== undefined,
      true,
    );
    // Verify order reference structure
    TestValidator.equals(
      `order ${refund.orderItem.order.id} has order_number`,
      refund.orderItem.order.order_number !== undefined,
      true,
    );
    TestValidator.equals(
      `order ${refund.orderItem.order.id} has total_price`,
      refund.orderItem.order.total_price !== undefined,
      true,
    );
    TestValidator.equals(
      `order ${refund.orderItem.order.id} has overall_status`,
      refund.orderItem.order.overall_status !== undefined,
      true,
    );
    TestValidator.equals(
      `order ${refund.orderItem.order.id} has created_at`,
      refund.orderItem.order.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      `order ${refund.orderItem.order.id} has updated_at`,
      refund.orderItem.order.updated_at !== undefined,
      true,
    );
  }
  // Test 9: Verify time_limit field (optional, can be null)
  for (const refund of allRefunds.data) {
    typia.assert(refund);
    if (refund.time_limit !== null && refund.time_limit !== undefined) {
      // Validate time_limit is a valid date string
      const timeLimitValue = refund.time_limit;
      TestValidator.predicate(
        `time_limit ${refund.id} is valid date-time`,
        () => !isNaN(new Date(timeLimitValue).getTime()),
      );
    }
  }
  // Test 10: Verify time_limit is approximately 7 days from delivery
  for (const refund of allRefunds.data) {
    typia.assert(refund);
    if (refund.time_limit !== null && refund.time_limit !== undefined) {
      const timeLimitValue = refund.time_limit;
      const timeLimitDate = new Date(timeLimitValue);
      const refundDate = new Date(refund.created_at);
      // time_limit should be approximately 7 days after delivery
      // Allow some tolerance for calculation accuracy
      const expectedDaysDifference = 7;
      const actualDaysDifference =
        (timeLimitDate.getTime() - refundDate.getTime()) /
        (1000 * 60 * 60 * 24);
      // Allow +/- 1 day tolerance for calculation accuracy
      TestValidator.predicate(
        `time_limit ${refund.id} is within 7-day window`,
        () => Math.abs(actualDaysDifference - expectedDaysDifference) <= 1,
      );
    }
  }
  // Test 11: Combine status filter with date range filter
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  const filteredByDate =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          request_status: "pending",
          created_at_gte: startDate.toISOString(),
          created_at_lte: endDate.toISOString(),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // All results should have pending status and be within date range
  for (const refund of filteredByDate.data) {
    typia.assert(refund);
    TestValidator.equals(
      `date filtered refund ${refund.id} status`,
      refund.request_status,
      "pending",
    );
    // Verify created_at is within date range
    if (refund.created_at) {
      const refundDate = new Date(refund.created_at);
      TestValidator.predicate(
        `date filtered refund ${refund.id} created_at >= start`,
        () => refundDate >= startDate,
      );
      TestValidator.predicate(
        `date filtered refund ${refund.id} created_at <= end`,
        () => refundDate <= endDate,
      );
    }
  }
  // Test 12: Verify last page returns hasNextPage=false equivalent (empty data on page 3)
  const lastPage =
    await api.functional.ecommerceMall.seller.refundRequests.dashboard.index(
      sellerAuthConnection,
      {
        body: {
          limit: 3,
          page: 3,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals("last page current", lastPage.pagination.current, 3);
  TestValidator.equals("last page data length", lastPage.data.length, 0);
  TestValidator.equals("last page records", lastPage.pagination.records, 6);
  TestValidator.equals("last page pages", lastPage.pagination.pages, 2);
}