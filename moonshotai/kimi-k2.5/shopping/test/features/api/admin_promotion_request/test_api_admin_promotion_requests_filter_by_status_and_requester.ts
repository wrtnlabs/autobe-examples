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

export async function test_api_admin_promotion_requests_filter_by_status_and_requester(
  connection: api.IConnection,
): Promise<void> {
  // Create customer and submit admin promotion request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "Customer with technical background requesting admin access to help moderate community content and manage platform quality",
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(customerRequest);
  TestValidator.equals(
    "customer request has pending status",
    customerRequest.status,
    "pending",
  );
  // Create seller and submit admin promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "Experienced seller requesting admin privileges to assist with marketplace governance and seller onboarding processes",
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(sellerRequest);
  TestValidator.equals(
    "seller request has pending status",
    sellerRequest.status,
    "pending",
  );
  // Test filter by status='pending'
  const pendingResults =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingResults);
  TestValidator.predicate(
    "pending filter returns at least 2 requests",
    pendingResults.data.length >= 2,
  );
  TestValidator.predicate(
    "all pending filtered results have status pending",
    pendingResults.data.every((r) => r.status === "pending"),
  );
  TestValidator.predicate(
    "customer request found in pending results",
    pendingResults.data.some((r) => r.id === customerRequest.id),
  );
  TestValidator.predicate(
    "seller request found in pending results",
    pendingResults.data.some((r) => r.id === sellerRequest.id),
  );
  // Test filter by requesterType='customer'
  const customerTypeResults =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          requesterType: "customer",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(customerTypeResults);
  TestValidator.predicate(
    "customer requesterType filter returns results",
    customerTypeResults.data.length >= 1,
  );
  TestValidator.predicate(
    "customer request is in customer-type filtered results",
    customerTypeResults.data.some((r) => r.id === customerRequest.id),
  );
  // Test filter by requesterType='seller'
  const sellerTypeResults =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          requesterType: "seller",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerTypeResults);
  TestValidator.predicate(
    "seller requesterType filter returns results",
    sellerTypeResults.data.length >= 1,
  );
  TestValidator.predicate(
    "seller request is in seller-type filtered results",
    sellerTypeResults.data.some((r) => r.id === sellerRequest.id),
  );
  // Test combined filter: status='pending' AND requesterType='seller'
  const combinedResults =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          requesterType: "seller",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.predicate(
    "combined filter returns at least 1 result",
    combinedResults.data.length >= 1,
  );
  TestValidator.predicate(
    "seller request is in combined filtered results",
    combinedResults.data.some((r) => r.id === sellerRequest.id),
  );
  TestValidator.predicate(
    "all combined filter results have pending status",
    combinedResults.data.every((r) => r.status === "pending"),
  );
  // Verify pagination metadata is present and valid
  TestValidator.equals(
    "pagination current page is 1",
    combinedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    combinedResults.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    combinedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    combinedResults.pagination.pages >= 0,
  );
}
