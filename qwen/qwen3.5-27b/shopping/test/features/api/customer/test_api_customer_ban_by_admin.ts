import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

/**
 * Test that an administrator can successfully ban a customer account.
 *
 * This test verifies the complete customer ban workflow:
 * 1. Creates a new customer account with active status
 * 2. Registers and authenticates as an administrator
 * 3. Admin bans the customer with a reason
 * 4. Validates the ban operation updated customer status correctly
 * 5. Confirms banned customer cannot log in
 */
export async function test_api_customer_ban_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customer);
  // Verify customer is active initially
  TestValidator.equals("customer status is active", customer.status, "active");
  TestValidator.equals(
    "customer deleted_at is null",
    customer.deleted_at,
    null,
  );
  // Store credentials for login test after ban
  const customerEmail = customer.email;
  const customerPassword = customerJoinBody.password;
  // 2. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Admin bans the customer
  const banReason = "Violation of terms of service";
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customer.id,
      body: {
        reason: banReason,
      } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  // 4. Validate ban operation
  TestValidator.equals(
    "customer status changed to banned",
    bannedCustomer.status,
    "banned",
  );
  TestValidator.equals(
    "customer deleted_at remains null",
    bannedCustomer.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at changed after ban",
    bannedCustomer.updated_at,
    bannedCustomer.created_at,
  );
  TestValidator.equals("customer id preserved", bannedCustomer.id, customer.id);
  TestValidator.equals(
    "customer email preserved",
    bannedCustomer.email,
    customer.email,
  );
  // 5. Verify banned customer cannot log in
  const bannedCustomerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("banned customer login should fail", async () => {
    await authorize_customer_login(bannedCustomerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
