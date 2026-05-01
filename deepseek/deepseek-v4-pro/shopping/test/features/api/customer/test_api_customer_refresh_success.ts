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
 * Test successful customer token refresh with token rotation validation.
 *
 * Validates the complete token refresh flow: a customer registers via join,
 * receives an initial token pair, then successfully refreshes their session
 * using the valid refresh token. The system generates new access and refresh
 * tokens, extends the session, and invalidates the old refresh token through
 * secure token rotation.
 *
 * Special attention is given to verifying that the old refresh token is
 * properly invalidated after rotation. Attempting to reuse the original
 * refresh token after a successful refresh must fail, confirming the token
 * rotation security mechanism works correctly.
 *
 * 1. Customer registers via join and receives initial token pair.
 * 2. Customer refreshes session using the valid refresh token.
 * 3. Validates new token pair is different from original.
 * 4. Validates customer identity fields remain consistent.
 * 5. Confirms old refresh token is rejected on reuse.
 */
export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer via join to get initial token pair
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(initialAuth);
  // 2. Save the original tokens for later comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 3. Refresh session using the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate new token pair and identity consistency
  TestValidator.equals(
    "customer id unchanged",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "customer email unchanged",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "customer display_name unchanged",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.notEquals(
    "access token is new",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is new",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  TestValidator.predicate(
    "access token expiry is future",
    () => new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is future",
    () => new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // 5. Confirm old refresh token is invalidated by token rotation
  await TestValidator.error(
    "old refresh token should be rejected",
    async () => {
      await api.functional.shoppingMall.auth.customer.refresh(
        { host: connection.host },
        {
          body: {
            refresh: originalRefreshToken,
          } satisfies IShoppingMallCustomer.IRefresh,
        },
      );
    },
  );
}
