import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Generate test data: create multiple cancellation requests with different timestamps
  // We'll simulate different dates by using fixed ISO strings
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
  // For simplicity, we'll test with the PATCH endpoint directly (no actual creation endpoint available)
  // We'll rely on existing data in the system for filtering tests
  // 2. Test exact date range filtering (yesterday to tomorrow)
  const dateRangeRequest: IEcommerceCancellationRequest.IRequest = {
    date_from: yesterday,
    date_to: tomorrow,
    limit: 50,
  } satisfies IEcommerceCancellationRequest.IRequest;
  const dateRangeResult =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResult);
  // Validate that all returned items have created_at within the date range
  for (const item of dateRangeResult.data) {
    TestValidator.predicate(
      `created_at ${item.created_at} should be >= ${yesterday} and <= ${tomorrow}`,
      item.created_at >= yesterday && item.created_at <= tomorrow,
    );
  }
  // 3. Test combination with other filters
  const combinedRequest: IEcommerceCancellationRequest.IRequest = {
    date_from: weekAgo,
    date_to: nextWeek,
    status: "pending",
    limit: 20,
  } satisfies IEcommerceCancellationRequest.IRequest;
  const combinedResult =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      { body: combinedRequest },
    );
  typia.assert(combinedResult);
  // 4. Test empty result for range with no data (far future)
  const futureDate = new Date(Date.now() + 365 * 86400000).toISOString();
  const futureRangeRequest: IEcommerceCancellationRequest.IRequest = {
    date_from: futureDate,
    date_to: new Date(Date.now() + 366 * 86400000).toISOString(),
    limit: 10,
  } satisfies IEcommerceCancellationRequest.IRequest;
  const futureResult =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      { body: futureRangeRequest },
    );
  typia.assert(futureResult);
  TestValidator.equals(
    "future range should return empty data",
    futureResult.data.length,
    0,
  );
  // 5. Test that pagination works with date filters
  const paginatedRequest: IEcommerceCancellationRequest.IRequest = {
    date_from: weekAgo,
    date_to: nextWeek,
    page: 1,
    limit: 5,
  } satisfies IEcommerceCancellationRequest.IRequest;
  const paginatedResult =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      { body: paginatedRequest },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginatedResult.pagination.current >= 1 &&
      paginatedResult.pagination.limit === 5 &&
      paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 0,
  );
  // 6. Test that only date_from or date_to alone works
  const fromOnlyRequest: IEcommerceCancellationRequest.IRequest = {
    date_from: weekAgo,
    limit: 10,
  } satisfies IEcommerceCancellationRequest.IRequest;
  const fromOnlyResult =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      { body: fromOnlyRequest },
    );
  typia.assert(fromOnlyResult);
  // Validate items have created_at >= weekAgo
  for (const item of fromOnlyResult.data) {
    TestValidator.predicate(
      `created_at ${item.created_at} should be >= ${weekAgo} when using date_from only`,
      item.created_at >= weekAgo,
    );
  }
}
