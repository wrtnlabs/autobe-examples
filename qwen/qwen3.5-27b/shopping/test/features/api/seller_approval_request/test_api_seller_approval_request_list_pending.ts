import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test that an authenticated administrator can retrieve a paginated list of pending seller approval requests.
 *
 * This test validates the seller approval request listing functionality by:
 * 1. Creating an administrator account and authenticating
 * 2. Creating multiple seller accounts with pending approval requests
 * 3. Retrieving the paginated list of pending requests
 * 4. Validating the response structure and data integrity
 */
export async function test_api_seller_approval_request_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost/admin/login",
      referrer: "http://localhost",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create 3 seller accounts with pending approval requests
  const sellerEmails: string[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerEmail = `seller${i}@test.com`;
    sellerEmails.push(sellerEmail);
    // Register seller
    await authorize_seller_join(sellerConnection, {
      body: {
        email: sellerEmail,
        password: "1234",
        shop_name: `Shop ${i}`,
        shop_description: `Description for shop ${i}`,
        href: "http://localhost/seller/register",
        referrer: "http://localhost",
      },
    });
    // Login as seller
    await authorize_seller_login(sellerConnection, {
      body: {
        email: sellerEmail,
        password: "1234",
        href: "http://localhost/seller/login",
        referrer: "http://localhost",
      } satisfies IShoppingMallSeller.ILogin,
    });
    // Submit approval request
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: `I want to sell on the platform - request ${i}`,
        },
      },
    );
  }
  // 3. Call the PATCH endpoint with status filter set to 'pending'
  const response: IPageIShoppingMallSellerApprovalRequest.ISummary =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate("has records", response.pagination.records >= 3);
  TestValidator.predicate("has pages", response.pagination.pages >= 1);
  // 5. Validate data array
  TestValidator.predicate("data array has items", response.data.length >= 3);
  // 6. Validate each request in the list
  for (const request of response.data) {
    // Verify status is 'pending'
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    // Verify seller information exists
    TestValidator.predicate(
      "seller has email",
      request.seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller has shop_name",
      request.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller approval_status is pending",
      request.seller.approval_status === "pending",
    );
    // Verify timestamps
    TestValidator.predicate(
      "submitted_at is valid date-time",
      !isNaN(Date.parse(request.submitted_at)),
    );
    TestValidator.equals(
      "responded_at is null for pending",
      request.responded_at,
      null,
    );
    // Verify request has reason
    TestValidator.predicate("reason is not empty", request.reason.length > 0);
  }
}
