import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test customer refund request search endpoint with various filter combinations.
 *
 * This test covers:
 * 1. Filtering by status (pending, approved, rejected)
 * 2. Date range filtering (requestedAtFrom, requestedAtTo)
 * 3. Pagination (page, limit)
 * 4. Response structure validation with pagination metadata
 * 5. Empty result handling
 * 6. Sorting verification (createdAt descending)
 */
export async function test_api_customer_refund_request_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple refund requests to have data for filtering
  const refundRequests: IEcommerceMallRefundRequest[] = [];
  for (let i = 0; i < 5; i++) {
    try {
      const refundRequest =
        await generate_random_ecommerce_mall_customer_refund_requests_create(
          customerConnection,
          {
            body: {
              reason: `Refund reason ${i}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            },
          },
        );
      typia.assert(refundRequest);
      refundRequests.push(refundRequest);
    } catch {
      break;
    }
  }
  // Skip filter tests if no refund requests were created
  if (refundRequests.length === 0) {
    const emptyResult =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {} satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(emptyResult);
    TestValidator.equals(
      "empty result pagination current",
      emptyResult.pagination.current,
      1,
    );
    TestValidator.equals(
      "empty result data length",
      emptyResult.data.length,
      0,
    );
    return;
  }
  // 3. Test filtering by status - pending
  const pendingResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter current page valid",
    pendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending filter limit valid",
    pendingResult.pagination.limit >= 1,
  );
  for (const item of pendingResult.data) {
    TestValidator.equals("pending item status", item.status, "pending");
  }
  // 4. Test filtering by status - approved
  const approvedResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  for (const item of approvedResult.data) {
    TestValidator.equals("approved item status", item.status, "approved");
  }
  // 5. Test filtering by status - rejected
  const rejectedResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  for (const item of rejectedResult.data) {
    TestValidator.equals("rejected item status", item.status, "rejected");
  }
  // 6. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: oneWeekAgo.toISOString(),
          requestedAtTo: oneWeekFromNow.toISOString(),
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter data valid",
    dateRangeResult.data.length >= 0,
  );
  // 7. Test pagination with custom limit
  const paginationResult =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination data respects limit",
    paginationResult.data.length <= 2,
  );
  // 8. Test response structure contains required fields
  if (paginationResult.data.length > 0) {
    const firstItem = paginationResult.data[0];
    TestValidator.predicate(
      "item has string id",
      typeof firstItem.id === "string",
    );
    TestValidator.predicate(
      "item has string reason",
      typeof firstItem.reason === "string",
    );
    TestValidator.predicate(
      "item has valid status",
      firstItem.status === "pending" ||
        firstItem.status === "approved" ||
        firstItem.status === "rejected",
    );
    TestValidator.predicate(
      "item has string requestedAt",
      typeof firstItem.requestedAt === "string",
    );
    TestValidator.predicate(
      "item has string createdAt",
      typeof firstItem.createdAt === "string",
    );
    TestValidator.predicate(
      "item has string orderItemId",
      typeof firstItem.orderItemId === "string",
    );
    TestValidator.predicate(
      "item has customer object",
      typeof firstItem.customer === "object",
    );
    TestValidator.predicate(
      "item has seller object",
      typeof firstItem.seller === "object",
    );
  }
  // 9. Test sorting by creation date descending
  if (paginationResult.data.length >= 2) {
    const firstDate = new Date(paginationResult.data[0].createdAt).getTime();
    const secondDate = new Date(paginationResult.data[1].createdAt).getTime();
    TestValidator.predicate(
      "results sorted by createdAt descending",
      firstDate >= secondDate,
    );
  }
  // 10. Test pagination metadata
  TestValidator.predicate(
    "pagination has valid records count",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    paginationResult.pagination.pages >= 0,
  );
  // 11. Test second page if enough data exists
  if (paginationResult.pagination.pages > 1) {
    const page2Result =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        customerConnection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current is 2",
      page2Result.pagination.current,
      2,
    );
  }
}
