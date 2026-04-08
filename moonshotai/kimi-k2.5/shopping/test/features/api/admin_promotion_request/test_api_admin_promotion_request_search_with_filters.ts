import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  /******************************************************************
   * SETUP: Create customer connection
   ******************************************************************/
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  /******************************************************************
   * SCENARIO 1: Create and filter pending promotion requests
   ******************************************************************/
  // Create a promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify the created request has pending status
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  // Search with pending status filter
  const searchResult =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          requesterType: null,
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: 10,
        } as IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists with current page",
    searchResult.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination exists with limit",
    searchResult.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination exists with records",
    searchResult.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination exists with pages",
    searchResult.pagination.pages !== undefined,
  );
  // Validate data contains at least the created promotion request
  TestValidator.predicate(
    "search result has data",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "search result contains at least one promotion request",
    searchResult.data.length > 0,
  );
  // Find the created promotion request in results
  const foundRequest = searchResult.data.find(
    (r) => r.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "created promotion request found in results",
    foundRequest !== undefined,
  );
  if (foundRequest) {
    TestValidator.equals(
      "request status matches",
      foundRequest.status,
      typia.assert<"pending" | "approved" | "rejected" | null | undefined>(promotionRequest.status),
    );
    TestValidator.equals(
      "request reason matches",
      foundRequest.reason,
      promotionRequest.reason,
    );
    TestValidator.equals(
      "requester is present",
      typeof foundRequest.requester,
      "object",
    );
    TestValidator.equals(
      "reviewer is null for pending",
      foundRequest.reviewer,
      null,
    );
    TestValidator.equals(
      "rejectionReason is null for pending",
      foundRequest.rejectionReason,
      null,
    );
  }
  // Validate that all returned requests have pending status
  const allPending = searchResult.data.every((r) => r.status === "pending");
  TestValidator.predicate("all search results have pending status", allPending);
  /******************************************************************
   * SCENARIO 2: Test pagination with limit
   ******************************************************************/
  const pageResult =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      customerConnection,
      {
        body: {
          status: null,
          requesterType: null,
          reviewed: null,
          sortBy: "createdAt",
          sortOrder: "desc",
          cursor: null,
          limit: 2,
          page: 1,
        } as IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pageResult);
  // Validate pagination returns at most the requested limit
  TestValidator.predicate(
    "data length does not exceed limit",
    pageResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pageResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    1,
  );
  // Validate records reflect actual count
  TestValidator.predicate(
    "total records >= current page data length",
    pageResult.pagination.records >= pageResult.data.length,
  );
  // Test with approved filter (should return empty for new customer)
  const approvedResult =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
          requesterType: null,
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: 10,
        } as IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Since we only created a pending request, approved filter should return empty data
  // Note: This could also contain approved requests from previous operations depending on test isolation
  // Just ensure structure is valid
  // Validate structure of pagination response for approved filter
  TestValidator.predicate(
    "approved filter returns valid array",
    Array.isArray(approvedResult.data),
  );
  TestValidator.predicate(
    "approved filter returns valid pagination",
    approvedResult.pagination !== undefined,
  );
  // Test with rejected filter
  const rejectedResult =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
          requesterType: null,
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: 10,
        } as IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter returns valid array",
    Array.isArray(rejectedResult.data),
  );
  TestValidator.predicate(
    "rejected filter returns valid pagination",
    rejectedResult.pagination !== undefined,
  );
  // Test with reviewed filter (null means no filter)
  const reviewedResult =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      customerConnection,
      {
        body: {
          status: null,
          requesterType: null,
          reviewed: true,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: 10,
        } as IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(reviewedResult);
  TestValidator.predicate(
    "reviewed filter returns valid array",
    Array.isArray(reviewedResult.data),
  );
  // Test with unreviewed filter (reviewed = false means pending)
  const unreviewedResult =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      customerConnection,
      {
        body: {
          status: null,
          requesterType: null,
          reviewed: false,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit: 10,
        } as IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(unreviewedResult);
  TestValidator.predicate(
    "unreviewed filter returns valid array",
    Array.isArray(unreviewedResult.data),
  );
  // Pending submissions (our created one) should be in unreviewed results
  const hasOurRequest = unreviewedResult.data.some(
    (r) => r.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "unreviewed results contain our pending request",
    hasOurRequest,
  );
}