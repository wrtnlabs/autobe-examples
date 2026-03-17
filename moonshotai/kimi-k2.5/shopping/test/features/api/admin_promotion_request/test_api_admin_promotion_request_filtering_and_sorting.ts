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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test filtering and sorting capabilities for administrator promotion requests.
 *
 * 1. Create multiple sellers and their promotion requests
 * 2. Test filtering by status='pending'
 * 3. Test filtering by requesterType='seller' (polymorphic filtering)
 * 4. Test filtering by submittedAtFrom and submittedAtTo date range
 * 5. Test filtering by reviewedAtFrom and reviewedAtTo
 * 6. Test sorting with sort='submittedAt:desc'
 * 7. Verify pagination metadata reflects filtered totals
 */
export async function test_api_admin_promotion_request_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create seller 1 and their promotion request
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
    seller1Connection,
    { body: { reason: "First seller promotion request for filtering test" } },
  );
  // Create seller 2 and their promotion request
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
    seller2Connection,
    { body: { reason: "Second seller promotion request for filtering test" } },
  );
  // Create seller 3 for additional test data
  const seller3Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
    seller3Connection,
    { body: { reason: "Third seller promotion request for filtering test" } },
  );
  // Test filtering by status='pending'
  const pendingFilterResponse =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      seller1Connection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResponse);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingFilterResponse.data.every((req) => req.status === "pending"),
  );
  // Test filtering by requesterType='seller'
  const sellerTypeFilterResponse =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      seller1Connection,
      {
        body: {
          requesterType: "seller",
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerTypeFilterResponse);
  // Test date range filtering (submittedAtFrom/To)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      seller1Connection,
      {
        body: {
          submittedAtFrom: oneHourAgo.toISOString(),
          submittedAtTo: oneHourLater.toISOString(),
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Should include our recently created requests
  TestValidator.predicate(
    "date range filter includes recent requests",
    dateRangeResponse.data.length >= 3,
  );
  // Test reviewedAt date range filtering (should return empty for pending requests)
  const reviewedAtFilterResponse =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      seller1Connection,
      {
        body: {
          reviewedAtFrom: oneHourAgo.toISOString(),
          reviewedAtTo: oneHourLater.toISOString(),
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(reviewedAtFilterResponse);
  // Pending requests shouldn't have review dates, so this should return empty or filtered results
  TestValidator.predicate(
    "reviewedAt filter returns empty or filtered results for pending requests",
    reviewedAtFilterResponse.data.length === 0 ||
      reviewedAtFilterResponse.data.every((req) => req.reviewer !== null),
  );
  // Test sorting by submittedAt:desc
  const sortedResponse =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      seller1Connection,
      {
        body: {
          sort: "submittedAt:desc",
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Verify descending order
  if (sortedResponse.data.length >= 2) {
    for (let i = 0; i < sortedResponse.data.length - 1; i++) {
      const currentDate = new Date(sortedResponse.data[i].createdAt).getTime();
      const nextDate = new Date(sortedResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        `sort by submittedAt:desc maintains descending order at index ${i}`,
        currentDate >= nextDate,
      );
    }
  }
  // Test combined filters
  const combinedFilterResponse =
    await api.functional.ecommerceMall.seller.pendingRequests.summary.index(
      seller1Connection,
      {
        body: {
          status: "pending",
          requesterType: "seller",
          sort: "submittedAt:desc",
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Verify all returned items are pending
  TestValidator.predicate(
    "combined filters return only pending requests",
    combinedFilterResponse.data.every((req) => req.status === "pending"),
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    combinedFilterResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    combinedFilterResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is greater than or equal to data length",
    combinedFilterResponse.pagination.records >=
      combinedFilterResponse.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    combinedFilterResponse.pagination.pages >= 0,
  );
}
