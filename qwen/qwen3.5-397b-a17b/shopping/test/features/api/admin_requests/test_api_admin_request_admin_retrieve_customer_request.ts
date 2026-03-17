import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an administrator can retrieve a specific customer's administrator promotion request by its ID.
 *
 * This test validates the complete workflow:
 * 1. Admin account creation and authentication
 * 2. Customer account creation and authentication
 * 3. Customer submits admin promotion request with reason
 * 4. Admin retrieves the request by ID
 * 5. Validates response structure including pending status, null response fields
 */
export async function test_api_admin_request_admin_retrieve_customer_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Create customer account with known credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 3. Create customer connection and login to submit admin request
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 4. Submit admin promotion request from customer
  const adminRequest =
    await generate_random_shopping_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 5. Create admin connection and login to retrieve the request
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 6. Retrieve the admin request by ID as admin
  const retrievedRequest =
    await api.functional.shoppingMall.admin.admin_requests.at(adminConnection, {
      requestId: adminRequest.id,
    });
  typia.assert(retrievedRequest);
  // 7. Validate the retrieved request matches the submitted request
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "PENDING");
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    customerJoin.customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customerJoin.email,
  );
  // 8. Verify pending request has null response fields
  TestValidator.equals(
    "responded_at is null for pending",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "respondedBySuperAdmin is null for pending",
    retrievedRequest.respondedBySuperAdmin,
    null,
  );
}
