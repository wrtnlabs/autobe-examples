import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
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
import { generate_random_shopping_mall_customer_admin_requests_create } from "../../../generate/generate_random_shopping_mall_customer_admin_requests_create";
import { prepare_random_shopping_mall_admin_request } from "../../../prepare/prepare_random_shopping_mall_admin_request";

/**
 * Test that a regular administrator can only view their own submitted
 * administrator promotion requests, not requests from other users.
 *
 * This test validates the data isolation and access control for admin
 * promotion requests. Regular administrators should only be able to see
 * their own submitted requests (from their customer account), ensuring
 * privacy and proper access control.
 *
 * Test Flow:
 * 1. Create and authenticate as regular administrator
 * 2. Create customer account for the admin and submit promotion request
 * 3. Create separate customer account and submit another request
 * 4. Verify admin can only see their own request (total = 1)
 * 5. Verify other customer's request is not visible in results
 */
export async function test_api_admin_request_list_regular_admin_own_requests_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin needs to submit request as customer, so create customer account for admin
  // Admin promotion requests are submitted from customer context, not admin context
  const adminAsCustomerConnection: api.IConnection = { host: connection.host };
  const adminCustomerAuth = await authorize_customer_join(
    adminAsCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(adminCustomerAuth);
  // 3. Submit admin promotion request as the admin (using customer connection)
  const adminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      adminAsCustomerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // 4. Create a separate customer account
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerAuth = await authorize_customer_join(
    otherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(otherCustomerAuth);
  // 5. Submit another admin request from the other customer
  const otherCustomerRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      otherCustomerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(otherCustomerRequest);
  // 6. Call the target endpoint as the admin's customer account to list requests
  // Regular admins can only view their own submitted promotion requests
  const response = await api.functional.shoppingMall.admin.admin_requests.index(
    adminAsCustomerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdminRequest.IRequest,
    },
  );
  typia.assert(response);
  // 7. Validate pagination shows only 1 record (admin's own request)
  TestValidator.equals(
    "total records should be 1 (only admin's own request)",
    response.pagination.records,
    1,
  );
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pages should be 1", response.pagination.pages, 1);
  // 8. Validate response contains exactly one request
  TestValidator.equals(
    "data array length should be 1",
    response.data.length,
    1,
  );
  // 9. Validate the visible request is the admin's own request
  const visibleRequest = response.data[0];
  TestValidator.equals(
    "visible request should be admin's own request",
    visibleRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "request status should be PENDING",
    visibleRequest.status,
    "PENDING",
  );
  // 10. Validate customer information matches the admin's customer account
  TestValidator.equals(
    "customer email should match admin's customer email",
    visibleRequest.customer.email,
    adminCustomerAuth.email,
  );
  TestValidator.equals(
    "customer id should match admin's customer id",
    visibleRequest.customer.id,
    adminCustomerAuth.id,
  );
  // 11. Verify other customer's request is NOT in the results
  const otherRequestFound = response.data.some(
    (req) => req.id === otherCustomerRequest.id,
  );
  TestValidator.predicate(
    "other customer's request should not be visible",
    !otherRequestFound,
  );
}
