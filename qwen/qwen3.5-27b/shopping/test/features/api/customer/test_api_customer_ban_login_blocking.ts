import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

/**
 * Test that banned customers cannot log in to the platform while their data is preserved, and can log in again after being unbanned.
 *
 * Validates the complete customer ban workflow including administrator authentication, customer registration, ban enforcement, login blocking, and unban restoration. Ensures that banned customers are prevented from authenticating while their account data remains intact, and that login access is immediately restored upon unban.
 *
 * Special attention is given to verifying that the ban status effectively blocks authentication attempts and that the unban operation fully restores customer access without requiring re-registration or additional steps.
 *
 * 1. Administrator registers and authenticates via /shoppingMall/auth/administrator/join.
 * 2. Customer registers with known credentials via /shoppingMall/auth/customer/join.
 * 3. Customer logs in successfully before ban to verify initial access.
 * 4. Administrator bans the customer via /shoppingMall/administrator/customers/{customerId}/ban with {"banned": true}.
 * 5. Verify banned customer cannot log in with valid credentials (expect error).
 * 6. Administrator unbans the customer via /shoppingMall/administrator/customers/{customerId}/ban with {"banned": false}.
 * 7. Verify customer can log in again after unban with same credentials.
 */
export async function test_api_customer_ban_login_blocking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Customer registration with known credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testpassword123";
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Verify customer can log in before ban
  const preBanLoginConnection: api.IConnection = { host: connection.host };
  const preBanLogin = await authorize_customer_login(preBanLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(preBanLogin);
  TestValidator.equals(
    "pre-ban login succeeds",
    preBanLogin.email,
    customerEmail,
  );
  // 4. Administrator bans the customer
  const bannedCustomer =
    await api.functional.shoppingMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customerId,
        body: { banned: true },
      },
    );
  typia.assert(bannedCustomer);
  TestValidator.equals("customer is banned", bannedCustomer.banned, true);
  // 5. Verify banned customer cannot log in
  await TestValidator.error("banned customer login fails", async () => {
    const bannedLoginConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(bannedLoginConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // 6. Administrator unbans the customer
  const unbannedCustomer =
    await api.functional.shoppingMall.administrator.customers.ban(
      adminConnection,
      {
        customerId: customerId,
        body: { banned: false },
      },
    );
  typia.assert(unbannedCustomer);
  TestValidator.equals("customer is unbanned", unbannedCustomer.banned, false);
  // 7. Verify customer can log in again after unban
  const postUnbanLoginConnection: api.IConnection = { host: connection.host };
  const postUnbanLogin = await authorize_customer_login(
    postUnbanLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(postUnbanLogin);
  TestValidator.equals(
    "post-unban login succeeds",
    postUnbanLogin.email,
    customerEmail,
  );
  TestValidator.equals("customer ID preserved", postUnbanLogin.id, customerId);
}
