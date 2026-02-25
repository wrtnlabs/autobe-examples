import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_request_date_range_filtering_refund_window(
  connection: api.IConnection,
): Promise<void> {
  // Setup seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Test various date range filtering scenarios
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Test 1: Basic date range filtering (past two weeks to past week)
  const basicFilterResult =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_start: twoWeeksAgo.toISOString(),
          requested_at_end: oneWeekAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(basicFilterResult);
  // Test 2: Recent refund window requests (past week to present)
  const recentWindowResult =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_start: oneWeekAgo.toISOString(),
          requested_at_end: today.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(recentWindowResult);
  // Test 3: Date filtering with pagination (all records from two weeks ago)
  const paginationResult =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_start: twoWeeksAgo.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination exists",
    typeof paginationResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page >= 1",
    paginationResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit <= 100",
    paginationResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records >= 0",
    paginationResult.pagination.records >= 0,
  );
  // Test 4: Future date range (should return empty results)
  const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_start: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "future date range returns empty",
    emptyResult.data.length,
    0,
  );
  // Test 5: Boundary condition - start date only
  const startOnlyResult =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_start: oneWeekAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(startOnlyResult);
  // Validate date boundaries if data exists
  if (basicFilterResult.data.length > 0) {
    const sampleRecord = basicFilterResult.data[0];
    const requestedAt = new Date(sampleRecord.requested_at);
    TestValidator.predicate(
      "requested_at within filtered range",
      requestedAt >= twoWeeksAgo && requestedAt <= oneWeekAgo,
    );
    // Validate refund window expiry timestamp structure
    const windowExpiry = new Date(sampleRecord.refund_window_expires_at);
    TestValidator.predicate(
      "refund_window_expires_at is valid date",
      !isNaN(windowExpiry.getTime()),
    );
    // Validate 7-day window calculation (if we had delivery date for comparison)
    TestValidator.predicate(
      "refund window is after request date",
      windowExpiry > requestedAt,
    );
  }
  // Test 6: Search functionality with date filtering
  const searchResult =
    await api.functional.ecommerce.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          search: "test",
          requested_at_start: twoWeeksAgo.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(searchResult);
}
