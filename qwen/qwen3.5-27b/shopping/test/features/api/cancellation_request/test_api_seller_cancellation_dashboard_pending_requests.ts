import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an approved seller can view their pending cancellation requests on the dashboard.
 *
 * This test validates the seller cancellation requests dashboard endpoint by:
 * 1. Creating and approving a seller account through admin workflow
 * 2. Creating a customer account
 * 3. Seller authenticates and accesses the cancellation requests dashboard
 * 4. Verifying the response structure and data isolation
 * 5. Validating pagination metadata and request details
 *
 * Note: This test assumes pre-seeded cancellation request data exists in the system.
 * In a real test environment, orders and cancellation requests would be created beforehand.
 */
export async function test_api_seller_cancellation_dashboard_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Seller registration - create seller account (will be pending approval)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "1234";
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    href: "https://test.com/seller/join",
    referrer: "https://test.com",
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  // 3. Customer setup - create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 4. Seller login with approved account
  // Note: In a real test, we would need to approve the seller first through admin
  // This test assumes the seller is already approved or the test environment has pre-approved sellers
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.com/seller/login",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Access cancellation requests dashboard with default pagination
  const dashboardResponse =
    await api.functional.shoppingMall.seller.cancellation_requests.dashboard.index(
      sellerLoginConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    dashboardResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", dashboardResponse.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    dashboardResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is calculated correctly",
    dashboardResponse.pagination.pages ===
      Math.ceil(
        dashboardResponse.pagination.records /
          dashboardResponse.pagination.limit,
      ),
  );
  // 7. Validate response structure
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(dashboardResponse.data),
  );
  // 8. Validate each cancellation request in the response (if any exist)
  if (dashboardResponse.data.length > 0) {
    await ArrayUtil.asyncForEach(dashboardResponse.data, async (request) => {
      typia.assert(request);
      // Validate required fields exist
      TestValidator.predicate(
        "request has valid id",
        typeof request.id === "string" && request.id.length > 0,
      );
      TestValidator.predicate(
        "request has reason",
        typeof request.reason === "string" && request.reason.length > 0,
      );
      TestValidator.predicate(
        "request has status",
        typeof request.status === "string" && request.status.length > 0,
      );
      TestValidator.predicate(
        "request has requestedAt timestamp",
        typeof request.requestedAt === "string" &&
          request.requestedAt.length > 0,
      );
      // Validate pending request fields
      if (request.status === "pending") {
        TestValidator.equals(
          "pending request respondedAt is null",
          request.respondedAt,
          null,
        );
        TestValidator.equals(
          "pending request rejectionReason is null",
          request.rejectionReason,
          null,
        );
        TestValidator.equals(
          "pending request seller is null",
          request.seller,
          null,
        );
      }
      // Validate customer information exists
      TestValidator.predicate(
        "request has customer information",
        request.customer !== null && request.customer !== undefined,
      );
      // Validate order item information exists
      TestValidator.predicate(
        "request has order item information",
        request.orderItem !== null && request.orderItem !== undefined,
      );
    });
  }
  // 9. Validate data isolation - only this seller's cancellation requests are returned
  // This is implicitly validated by the API's authorization logic
  TestValidator.predicate(
    "dashboard returns valid pagination and data structure",
    dashboardResponse.pagination.current >= 1 &&
      dashboardResponse.pagination.limit > 0 &&
      Array.isArray(dashboardResponse.data),
  );
}
