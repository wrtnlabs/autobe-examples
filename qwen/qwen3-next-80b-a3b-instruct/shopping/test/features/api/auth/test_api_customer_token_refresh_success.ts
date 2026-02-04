import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize a customer account via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Step 2: Extract the refresh token from the initial authentication response
  const originalRefreshToken = customer.token.refresh;
  // Step 3: Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Execute the token refresh with the valid refresh token
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  // Step 5: Validate that refresh was successful with new tokens
  TestValidator.equals(
    "refreshed customer ID matches original",
    refreshed.customerId,
    customer.customerId,
  );
  TestValidator.notEquals(
    "new access token differs from original",
    refreshed.token.access,
    customer.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshed.token.refresh,
    customer.token.refresh,
  );
  // Step 6: Validate that refresh token has proper format (non-empty string)
  TestValidator.predicate(
    "refresh token is non-empty string",
    () =>
      typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    () =>
      typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  // Step 7: Validate that token expiration timestamps are valid ISO 8601 date-time strings
  TestValidator.predicate("expired_at is valid ISO 8601 date-time", () => {
    const date = new Date(refreshed.token.expired_at);
    return !isNaN(date.getTime()) && refreshed.token.expired_at.length > 0;
  });
  TestValidator.predicate(
    "refreshable_until is valid ISO 8601 date-time",
    () => {
      const date = new Date(refreshed.token.refreshable_until);
      return (
        !isNaN(date.getTime()) && refreshed.token.refreshable_until.length > 0
      );
    },
  );
  // Step 8: Validate that the refresh connection's headers were updated with the new access token
  TestValidator.equals(
    "connection authorization header updated",
    refreshConnection.headers?.Authorization,
    refreshed.token.access,
  );
  // Step 9: Test that original refresh token is revoked
  // Attempt refresh with original token (should fail with 401)
  await TestValidator.error(
    "original refresh token should be revoked after refresh",
    async () => {
      // Create a new connection for this attempt
      const revokedTokenConnection: api.IConnection = { host: connection.host };
      await authorize_customer_refresh(revokedTokenConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
  // Step 10: Test for invalid refresh token format
  await TestValidator.error(
    "invalid refresh token format should fail",
    async () => {
      const invalidTokenConnection: api.IConnection = { host: connection.host };
      await authorize_customer_refresh(invalidTokenConnection, {
        body: {
          refreshToken: "invalid-token-format",
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
  // Step 11: Test for empty refresh token
  await TestValidator.error("empty refresh token should fail", async () => {
    const emptyTokenConnection: api.IConnection = { host: connection.host };
    await authorize_customer_refresh(emptyTokenConnection, {
      body: { refreshToken: "" } satisfies IShoppingMallCustomer.IRefresh,
    });
  });
  // Step 12: Test for null refresh token - REMOVED as null is not assignable to string type
  // Step 13: Test for undefined refresh token - REMOVED as undefined is not assignable to string type
  // Step 14: Test for refresh token from different account
  await TestValidator.error(
    "refresh token from different account should fail",
    async () => {
      const differentCustomerConnection: api.IConnection = {
        host: connection.host,
      };
      const differentCustomer = await authorize_customer_join(
        differentCustomerConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallCustomer.IJoin,
        },
      );
      typia.assert(differentCustomer);
      // Use different customer's refresh token
      const wrongTokenConnection: api.IConnection = { host: connection.host };
      await authorize_customer_refresh(wrongTokenConnection, {
        body: {
          refreshToken: differentCustomer.token.refresh,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}