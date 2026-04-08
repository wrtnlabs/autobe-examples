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
 * Test token refresh failure when customer account is banned by administrator.
 *
 * Validates that banned customer accounts cannot refresh their authentication tokens. The test registers an administrator and a customer, then uses the administrator to ban the customer account. After the ban, the test attempts to refresh the customer's tokens and verifies that the operation fails with a 403 Forbidden error.
 *
 * This test ensures that account status is verified during token refresh operations, preventing banned users from maintaining or extending their sessions. The ban action should immediately affect active sessions, demonstrating proper security policy enforcement.
 *
 * 1. Administrator registers and authenticates to obtain admin connection.
 * 2. Customer registers to obtain initial refresh token and customer connection.
 * 3. Administrator bans the customer account using the ban endpoint.
 * 4. Customer attempts to refresh tokens with the previously valid refresh token.
 * 5. Validates that the refresh operation fails with HTTP 403 Forbidden status.
 */
export async function test_api_customer_refresh_token_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin_ban_test@test.com",
      password: "AdminPass123",
    },
  });
  // 2. Customer registration to obtain refresh token
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer_ban_test@test.com",
      password: "CustomerPass123",
    },
  });
  typia.assert(customerAuth);
  // Store the refresh token before ban
  const refreshToken = customerAuth.token.refresh;
  const customerId = customerAuth.id;
  // 3. Administrator bans the customer account
  const bannedCustomer =
    await api.functional.shoppingMall.administrator.customers.ban(
      adminConnection,
      {
        customerId,
        body: { banned: true } satisfies IShoppingMallCustomer.IBanRequest,
      },
    );
  typia.assert(bannedCustomer);
  // Verify the customer is now banned
  TestValidator.equals("customer banned status", bannedCustomer.banned, true);
  // 4. Attempt to refresh tokens with banned account
  await TestValidator.httpError(
    "refresh token fails for banned customer",
    403,
    async () =>
      await authorize_customer_refresh(customerConnection, {
        body: {
          refreshToken,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallCustomer.IRefresh,
      }),
  );
}
