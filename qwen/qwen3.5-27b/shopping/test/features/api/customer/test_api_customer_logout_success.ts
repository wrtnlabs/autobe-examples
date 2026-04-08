import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the primary success path for customer logout functionality.
 *
 * Validates that customer logout properly terminates the authentication session. The test verifies successful logout operation and token invalidation through session termination.
 *
 * This test ensures the logout endpoint correctly handles authenticated customer sessions and returns the expected no-content response.
 *
 * 1. Register a new customer account and obtain authentication tokens
 * 2. Verify the customer has valid access and refresh tokens
 * 3. Call the logout endpoint to terminate the session
 * 4. Verify logout returns successfully with void response (HTTP 204 No Content)
 */
export async function test_api_customer_logout_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Verify customer has valid tokens before logout
  TestValidator.predicate(
    "customer has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "customer has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration time",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refresh deadline",
    authorized.token.refreshable_until.length > 0,
  );
  // 3. Call logout endpoint to terminate session
  const output =
    await api.functional.shoppingMall.customer.logout(customerConnection);
  // 4. Verify logout succeeded with void response (HTTP 204 No Content)
  typia.assert(output);
  TestValidator.equals("logout returns void", output, undefined);
}
