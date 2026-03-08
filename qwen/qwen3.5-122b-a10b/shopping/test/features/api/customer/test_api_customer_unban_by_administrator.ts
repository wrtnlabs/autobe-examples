import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an administrator can successfully unban a previously banned customer account.
 *
 * The workflow should:
 * 1) Register an administrator account
 * 2) Register a customer account
 * 3) Ban the customer account using the admin ban endpoint
 * 4) Unban the customer account using this endpoint
 * 5) Verify the customer's account_status changes from 'banned' to 'active'
 * 6) Verify the customer can now log in successfully
 * 7) Verify all historical data (orders, reviews, wishlists) are preserved
 *
 * This validates the primary success path for administrator customer management capabilities.
 */
export async function test_api_customer_unban_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Register customer account
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // Verify initial account status is 'active'
  TestValidator.equals(
    "initial account status",
    customerAuth.account_status,
    "active",
  );
  // 3. Ban the customer account using admin endpoint
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const bannedCustomer = await api.functional.ecommerceMall.admin.customers.ban(
    adminLoginConnection,
    { customerId },
  );
  typia.assert(bannedCustomer);
  // Verify customer is now banned
  TestValidator.equals(
    "banned account status",
    bannedCustomer.account_status,
    "banned",
  );
  // 4. Verify customer cannot login while banned
  await TestValidator.error("banned customer cannot login", async () => {
    await api.functional.ecommerceMall.auth.customer.login.signIn(
      customerConnection,
      {
        body: {
          email: customerEmail,
          password: customerPassword,
        } satisfies IEcommerceMallCustomer.ILogin,
      },
    );
  });
  // 5. Unban the customer account using admin endpoint
  const unbannedCustomer =
    await api.functional.ecommerceMall.admin.customers.unban(
      adminLoginConnection,
      { customerId },
    );
  typia.assert(unbannedCustomer);
  // 6. Verify account status changes from 'banned' to 'active'
  TestValidator.equals(
    "unbanned account status",
    unbannedCustomer.account_status,
    "active",
  );
  // 7. Verify customer can now login successfully
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const reauthorizedCustomer = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(reauthorizedCustomer);
  // 8. Verify customer data is preserved after unban
  TestValidator.equals(
    "email preserved",
    reauthorizedCustomer.email,
    customerEmail,
  );
  TestValidator.equals(
    "display_name preserved",
    reauthorizedCustomer.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "phone_number preserved",
    reauthorizedCustomer.phone_number,
    customerAuth.phone_number,
  );
  TestValidator.equals(
    "created_at preserved",
    reauthorizedCustomer.created_at,
    customerAuth.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    reauthorizedCustomer.updated_at !== customerAuth.updated_at,
  );
}