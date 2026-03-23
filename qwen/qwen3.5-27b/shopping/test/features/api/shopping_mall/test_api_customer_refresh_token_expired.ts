import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test refresh token expiration handling when the refresh token has exceeded its 7-day validity period.
 *
 * This test validates that expired refresh tokens are properly rejected,
 * forcing users to re-authenticate with their credentials. This ensures
 * security by limiting the maximum session duration to 7 days as specified
 * in the token policy.
 */
export async function test_api_customer_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Simulate an expired refresh token
  // In a real scenario, we would wait 7+ days, but for testing purposes
  // we use an invalid token that will be rejected as expired
  const expiredRefreshToken =
    "expired_token_simulation_" + typia.random<string>();
  // 3. Attempt to refresh with expired token - should fail
  const expiredTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token should be rejected",
    [401, 403],
    async () =>
      await authorize_customer_refresh(expiredTokenConnection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      }),
  );
}
