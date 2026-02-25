import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account and obtain initial authentication tokens
  const initialConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(initialConnection, {});
  typia.assert(initialAuth);
  // Step 2: Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 3: Call refresh endpoint with the refresh token
  const refreshed = await api.functional.ecommerce.auth.customer.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialAuth.token.refresh,
      } satisfies IEcommerceCustomer.IRefresh,
    },
  );
  typia.assert(refreshed);
  // Step 4: Validate that new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be different",
    refreshed.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    refreshed.token.refresh,
    initialAuth.token.refresh,
  );
  // Step 5: Validate that expiration timestamps are updated
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(refreshed.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    new Date(refreshed.token.refreshable_until) > new Date(),
  );
  // Step 6: Validate customer identity remains consistent
  TestValidator.equals(
    "customer ID should remain the same",
    refreshed.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email should remain the same",
    refreshed.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "display_name should remain the same",
    refreshed.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "phone_number should remain the same",
    refreshed.phone_number,
    initialAuth.phone_number,
  );
  // Step 7: Test that the new access token can be used for authentication
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    Authorization: `Bearer ${refreshed.token.access}`,
  };
  // Note: This step assumes there will be a protected endpoint to test
  // The actual endpoint call would depend on available APIs
  // For now, we just validate the token structure is correct
  TestValidator.predicate(
    "access token should be a non-empty string",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    refreshed.token.refresh.length > 0,
  );
}
