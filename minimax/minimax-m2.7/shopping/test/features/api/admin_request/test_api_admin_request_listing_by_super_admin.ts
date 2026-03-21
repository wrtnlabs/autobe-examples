import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { generate_random_ecommerce_mall_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

export async function test_api_admin_request_listing_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account for listing admin requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create customer account and submit admin request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const customerRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "I want to help moderate the platform and ensure quality content.",
          requested_grade: "admin",
        },
      },
    );
  typia.assert(customerRequest);
  // 3. Create seller account and submit admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "As a seller, I understand the marketplace well and can contribute to platform improvements.",
          requested_grade: "super_admin",
        },
      },
    );
  typia.assert(sellerRequest);
  // 4. Call PATCH /superAdmin/admin/requests with empty request body to retrieve all admin requests
  const response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate response returns paginated results with correct structure
  TestValidator.equals("has pagination metadata", !!response.pagination, true);
  TestValidator.equals("has data array", !!response.data, true);
  TestValidator.equals(
    "pagination is IPage.IPagination",
    typeof response.pagination.current === "number",
    true,
  );
  // 6. Verify pagination metadata structure
  TestValidator.predicate(
    "current page is valid number",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid number",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is valid",
    response.pagination.records >= 2,
  );
  TestValidator.predicate(
    "total pages is valid",
    response.pagination.pages >= 1,
  );
  // 7. Verify each request includes required fields
  for (const request of response.data) {
    TestValidator.equals("has id", typeof request.id === "string", true);
    TestValidator.equals(
      "has actor_type",
      typeof request.actor_type === "string",
      true,
    );
    TestValidator.equals(
      "has requested_grade",
      typeof request.requested_grade === "string",
      true,
    );
    TestValidator.equals(
      "has status",
      typeof request.status === "string",
      true,
    );
    TestValidator.equals(
      "has created_at",
      typeof request.created_at === "string",
      true,
    );
    TestValidator.predicate(
      "actor_type is valid",
      request.actor_type === "customer" || request.actor_type === "seller",
    );
    TestValidator.predicate(
      "requested_grade is valid",
      request.requested_grade === "admin" ||
        request.requested_grade === "super_admin",
    );
    TestValidator.predicate(
      "status is valid",
      request.status === "pending" ||
        request.status === "approved" ||
        request.status === "rejected",
    );
  }
  // 8. Verify results are sorted by created_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const prev = new Date(response.data[i - 1].created_at);
    const curr = new Date(response.data[i].created_at);
    TestValidator.predicate(
      `item ${i} is older or equal to item ${i - 1}`,
      prev >= curr,
    );
  }
  // 9. Verify pending requests have null reviewer
  const pendingRequests = response.data.filter((r) => r.status === "pending");
  for (const pending of pendingRequests) {
    TestValidator.equals(
      "pending request has null reviewer",
      pending.reviewer,
      null,
    );
  }
  // 10. Verify we have at least 2 requests (one from customer, one from seller)
  TestValidator.predicate(
    "has at least 2 admin requests",
    response.data.length >= 2,
  );
  // 11. Verify the requests we created are in the response
  const customerRequestInList = response.data.find(
    (r) => r.id === customerRequest.id,
  );
  TestValidator.equals(
    "customer admin request is in list",
    !!customerRequestInList,
    true,
  );
  if (customerRequestInList) {
    TestValidator.equals(
      "customer request has correct actor_type",
      customerRequestInList.actor_type,
      "customer",
    );
    TestValidator.equals(
      "customer request has correct status",
      customerRequestInList.status,
      "pending",
    );
  }
  const sellerRequestInList = response.data.find(
    (r) => r.id === sellerRequest.id,
  );
  TestValidator.equals(
    "seller admin request is in list",
    !!sellerRequestInList,
    true,
  );
  if (sellerRequestInList) {
    TestValidator.equals(
      "seller request has correct actor_type",
      sellerRequestInList.actor_type,
      "seller",
    );
    TestValidator.equals(
      "seller request has correct status",
      sellerRequestInList.status,
      "pending",
    );
  }
}
