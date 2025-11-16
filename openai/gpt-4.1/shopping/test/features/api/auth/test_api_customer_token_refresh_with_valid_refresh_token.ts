import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test that a customer can refresh their tokens with a valid refresh token.
 *
 * 1. Register a new customer
 * 2. Save the initial refresh and access tokens
 * 3. Perform token refresh using /auth/customer/refresh with the valid refresh
 *    token
 * 4. Assert a new access/refresh token is returned
 * 5. Validate token values are different (rotation) and all token properties are
 *    correct
 */
export async function test_api_customer_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const registered = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(registered);

  // 2. Save issued tokens
  const originalToken = registered.token;

  // 3. Use refresh token to obtain new tokens
  const refreshed = await api.functional.auth.customer.refresh(connection, {
    body: {
      refresh_token: originalToken.refresh,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  const newToken = refreshed.token;

  // 4. Assert new token values are different (rotation should occur)
  TestValidator.notEquals(
    "access token is rotated",
    newToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated",
    newToken.refresh,
    originalToken.refresh,
  );

  // 5. Validate properties
  TestValidator.equals(
    "customer id stays the same",
    refreshed.id,
    registered.id,
  );
  TestValidator.equals("email should match", refreshed.email, registered.email);
  TestValidator.equals("name should match", refreshed.name, registered.name);
  TestValidator.equals("phone should match", refreshed.phone, registered.phone);
  TestValidator.equals(
    "is_email_verified should not change",
    refreshed.is_email_verified,
    registered.is_email_verified,
  );

  // 6. Assert token times are in ISO string format and different from previous
  TestValidator.notEquals(
    "token expired_at should update",
    newToken.expired_at,
    originalToken.expired_at,
  );
  TestValidator.notEquals(
    "token refreshable_until should update",
    newToken.refreshable_until,
    originalToken.refreshable_until,
  );
}
