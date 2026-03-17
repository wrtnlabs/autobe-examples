import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
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
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_requests_filter_by_date_ranges_and_ids(
  connection: api.IConnection,
): Promise<void> {
  // Create customer actor and submit promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: "Customer requesting admin access for testing date filters",
        },
      },
    );
  typia.assert(customerRequest);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create seller actor and submit promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Seller requesting admin access for testing date filters",
        },
      },
    );
  typia.assert(sellerRequest);
  // Use seller connection to test the filter endpoint (PATCH /ecommerceMall/seller/admin-promotion-requests)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // Test 1: Filter by date range that includes both requests
  const dateRangeResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          submittedAtFrom: oneHourAgo.toISOString(),
          submittedAtTo: oneHourLater.toISOString(),
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter should include recent requests",
    dateRangeResult.data.length >= 2,
  );
  // Test 2: Filter by requesterId (customer)
  const customerRequesterResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          requesterId: customer.id,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(customerRequesterResult);
  TestValidator.equals(
    "filter by customer requesterId should return customer's request",
    customerRequesterResult.data.some((r) => r.id === customerRequest.id),
    true,
  );
  // Test 3: Filter by requesterId (seller)
  const sellerRequesterResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          requesterId: seller.id,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerRequesterResult);
  TestValidator.equals(
    "filter by seller requesterId should return seller's request",
    sellerRequesterResult.data.some((r) => r.id === sellerRequest.id),
    true,
  );
  // Test 4: Filter by date range that excludes all requests (far future)
  const farFutureStart = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const farFutureEnd = new Date(
    now.getTime() + 48 * 60 * 60 * 1000,
  ).toISOString();
  const emptyDateResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          submittedAtFrom: farFutureStart,
          submittedAtTo: farFutureEnd,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(emptyDateResult);
  TestValidator.equals(
    "date range filter with no matches should return empty data",
    emptyDateResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show 0 records when no matches",
    emptyDateResult.pagination.records,
    0,
  );
  // Test 5: Filter by reviewerId (should return empty since requests are pending)
  const nonExistentReviewerId = "00000000-0000-0000-0000-000000000000";
  const reviewerResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          reviewerId: nonExistentReviewerId,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(reviewerResult);
  TestValidator.equals(
    "filter by non-existent reviewerId should return empty data",
    reviewerResult.data.length,
    0,
  );
  // Test 6: Combined filters (date range + requester type)
  const combinedResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          submittedAtFrom: oneHourAgo.toISOString(),
          submittedAtTo: oneHourLater.toISOString(),
          requesterType: "customer",
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined date range and requesterType filter should work",
    combinedResult.data.every((r) => {
      const submittedAt = new Date(r.createdAt).getTime();
      return (
        submittedAt >= oneHourAgo.getTime() &&
        submittedAt <= oneHourLater.getTime()
      );
    }),
  );
}
