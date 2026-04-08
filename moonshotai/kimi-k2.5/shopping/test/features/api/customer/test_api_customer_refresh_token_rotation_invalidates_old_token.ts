import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer refresh token rotation behavior.
 *
 * This test validates that when a refresh token is used to obtain new tokens,
 * the original refresh token is immediately invalidated. This is a critical
 * security mechanism that prevents replay attacks using stolen or intercepted
 * refresh tokens. The test ensures the server implements proper token rotation
 * and single-use semantics for refresh tokens.
 *
 * @param connection - Base connection object
 */
export async function test_api_customer_refresh_token_rotation_invalidates_old_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer to get initial token pair
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Store the original refresh token for later reuse attempt
  const originalRefreshToken = authorized.token.refresh;
  // Step 2: Use the original refresh token to get new tokens (rotation)
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(refreshConnection1, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  // Verify new tokens are different from original
  TestValidator.notEquals(
    "access token changed after refresh",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after rotation",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
  // Step 3: Attempt to use the ORIGINAL refresh token again (should fail)
  await TestValidator.error(
    "old refresh token should be invalidated after rotation",
    async () => {
      const refreshConnection2: api.IConnection = { host: connection.host };
      await authorize_customer_refresh(refreshConnection2, {
        body: {
          refresh: originalRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      });
    },
  );
}
