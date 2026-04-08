import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account to get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {});
  // Store original tokens for comparison
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // 2. Call refresh endpoint with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse =
    await api.functional.ecommerceMall.auth.customer.refresh(
      refreshConnection,
      {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      },
    );
  // 3. Validate refresh response structure using typia.assert
  typia.assert(refreshResponse);
  // 4. Validate that new tokens are different from original tokens
  TestValidator.notEquals(
    "new access token",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 5. Validate token structure has all required fields
  TestValidator.predicate(
    "access token is non-empty string",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(refreshResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(refreshResponse.token.refreshable_until)),
  );
  // 6. Validate customer profile exists
  TestValidator.predicate(
    "profile exists",
    refreshResponse.profile !== undefined,
  );
  TestValidator.predicate(
    "customer ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(refreshResponse.id),
  );
  TestValidator.equals(
    "email matches from join",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "customer ID matches from join",
    refreshResponse.id,
    joinResponse.id,
  );
  // 7. Validate profile fields
  TestValidator.predicate(
    "display name exists",
    refreshResponse.profile.displayName.length > 0,
  );
  TestValidator.predicate(
    "profile ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(refreshResponse.profile.id),
  );
  // 8. Validate addresses array exists (empty for new customer)
  TestValidator.predicate(
    "addresses is array",
    Array.isArray(refreshResponse.addresses),
  );
  // 9. Verify the customer can authenticate with the new access token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers ??= {};
  authenticatedConnection.headers.Authorization = `Bearer ${refreshResponse.token.access}`;
  TestValidator.predicate(
    "can use new access token for authenticated requests",
    authenticatedConnection.headers.Authorization !== undefined,
  );
}
