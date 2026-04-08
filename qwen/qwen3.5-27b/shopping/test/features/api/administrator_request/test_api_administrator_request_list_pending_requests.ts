import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test super administrator viewing pending administrator promotion requests.
 *
 * Validates the complete flow of super administrators retrieving pending administrator promotion requests submitted by platform users. Ensures that the endpoint correctly filters requests by status, returns accurate pagination metadata, and includes all required fields for pending requests.
 *
 * Special attention is given to verifying that pending requests have null values for rejection_reason and processedByAdministrator, and that both customer and seller submitted requests are included in the results.
 *
 * 1. Register a super administrator account and authenticate.
 * 2. Register a customer account and submit an administrator request with a valid reason.
 * 3. Register a seller account and submit an administrator request with a valid reason.
 * 4. Super administrator calls the administrator requests endpoint with status filter 'pending'.
 * 5. Validates pagination metadata accuracy and data array contents.
 * 6. Verifies both customer and seller requests are included with correct fields.
 */
export async function test_api_administrator_request_list_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    },
  });
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
      href: "https://test.com/customer",
      referrer: "https://test.com/login",
    },
  });
  // 3. Customer submits administrator request
  const customerReason =
    "I have extensive experience in platform management and want to help moderate the community.";
  await api.functional.shoppingMall.customer.administrator_requests.create(
    customerConnection,
    {
      body: {
        reason: customerReason,
      } satisfies IShoppingMallAdministratorRequest.ICreate,
    },
  );
  // 4. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com/seller",
      referrer: "https://test.com/login",
    },
  });
  // 5. Seller submits administrator request
  const sellerReason =
    "As a successful seller, I understand platform operations and want to contribute to admin duties.";
  await api.functional.shoppingMall.seller.administrator_requests.create(
    sellerConnection,
    {
      body: {
        reason: sellerReason,
      } satisfies IShoppingMallAdministratorRequest.ICreate,
    },
  );
  // 6. Super administrator retrieves pending requests
  const response =
    await api.functional.shoppingMall.administrator.administrator_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          pageSize: 20,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(response);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages count", response.pagination.pages, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  // 8. Validate data array contains exactly 2 requests
  TestValidator.equals("data array length", response.data.length, 2);
  // 9. Validate both requests have pending status
  TestValidator.predicate(
    "first request is pending",
    response.data[0].status === "pending",
  );
  TestValidator.predicate(
    "second request is pending",
    response.data[1].status === "pending",
  );
  // 10. Validate both requests have null rejection_reason
  TestValidator.equals(
    "first request rejection_reason is null",
    response.data[0].rejection_reason,
    null,
  );
  TestValidator.equals(
    "second request rejection_reason is null",
    response.data[1].rejection_reason,
    null,
  );
  // 11. Validate both requests have null processedByAdministrator
  TestValidator.equals(
    "first request processedByAdministrator is null",
    response.data[0].processedByAdministrator,
    null,
  );
  TestValidator.equals(
    "second request processedByAdministrator is null",
    response.data[1].processedByAdministrator,
    null,
  );
  // 12. Validate actor types include both customer and seller
  const actorTypes = response.data.map((req) => req.actor_type);
  TestValidator.predicate(
    "contains customer request",
    actorTypes.includes("customer"),
  );
  TestValidator.predicate(
    "contains seller request",
    actorTypes.includes("seller"),
  );
  // 13. Validate results are ordered by created_at DESC (newest first)
  TestValidator.predicate(
    "results ordered by created_at DESC",
    new Date(response.data[0].created_at).getTime() >=
      new Date(response.data[1].created_at).getTime(),
  );
}
