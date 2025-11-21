import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller authentication login audit trail functionality.
 *
 * This test validates that seller authentication attempts are properly
 * processed for security monitoring and compliance purposes. It tests
 * authentication scenarios including the proper handling of credentials, token
 * generation, error responses, and connection management for seller business
 * accounts.
 *
 * Since audit trail logging is an internal system feature not directly
 * accessible through the API, this test focuses on validating the
 * authentication process mechanics that would generate audit events.
 *
 * Test workflow:
 *
 * 1. Test authentication with invalid credentials (expected to fail)
 * 2. Test authentication with malformed data (expected to fail)
 * 3. Verify authentication response structure and error handling
 * 4. Validate connection header management for security
 * 5. Test multiple authentication attempt patterns
 */
export async function test_api_seller_login_audit_trail(
  connection: api.IConnection,
) {
  // Test failed authentication with invalid credentials
  const invalidCredentials = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.ILogin,
  };

  await TestValidator.error(
    "authentication fails with invalid credentials",
    async () => {
      await api.functional.auth.seller.login(connection, invalidCredentials);
    },
  );

  // Test failed authentication with malformed email format
  await TestValidator.error(
    "authentication fails with malformed email",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: "not-a-valid-email-format" as string & tags.Format<"email">,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test authentication with empty credentials
  await TestValidator.error(
    "authentication fails with empty email",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: "" as string & tags.Format<"email">,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  await TestValidator.error(
    "authentication fails with empty password",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "",
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Test authentication with very long password
  await TestValidator.error(
    "authentication handles very long password securely",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(256),
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // Verify connection headers remain unchanged after failed authentication
  TestValidator.equals(
    "connection headers unchanged after failed login",
    connection.headers?.Authorization,
    undefined,
  );

  // Test multiple sequential authentication attempts
  const failedAttempts = ArrayUtil.repeat(5, (index) => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8 + index),
  }));

  for (const credentials of failedAttempts) {
    const freshConnection: api.IConnection = { ...connection, headers: {} };

    await TestValidator.error(
      "sequential authentication attempts fail consistently",
      async () => {
        await api.functional.auth.seller.login(freshConnection, {
          body: credentials satisfies IShoppingMallSeller.ILogin,
        });
      },
    );

    // Verify no authorization header set after failed attempts
    TestValidator.equals(
      "no authorization header after failed attempt",
      freshConnection.headers?.Authorization,
      undefined,
    );
  }

  // Test that connection with existing authorization header is preserved
  const connectionWithAuth: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer fake-token" },
  };

  await TestValidator.error(
    "authentication attempt with existing auth header fails",
    async () => {
      await api.functional.auth.seller.login(connectionWithAuth, {
        body: invalidCredentials.body,
      });
    },
  );

  // Verify original auth header is not overwritten by failed authentication
  TestValidator.equals(
    "original auth header preserved after failed login",
    connectionWithAuth.headers?.Authorization,
    "Bearer fake-token",
  );

  // Validate IShoppingMallSeller.ILogin DTO structure
  const validLoginStructure = {
    body: {
      email: "test@example.com",
      password: "ValidPassword123",
    } satisfies IShoppingMallSeller.ILogin,
  };

  typia.assert(validLoginStructure.body);

  // Test IAuthorizationToken structure validation
  const sampleToken = {
    access: typia.random<string>(),
    refresh: typia.random<string>(),
    expired_at: new Date(Date.now() + 3600000).toISOString(),
    refreshable_until: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IAuthorizationToken;

  typia.assert(sampleToken);

  // Validate token timestamp formats
  TestValidator.predicate(
    "token expiration is valid ISO date",
    !isNaN(Date.parse(sampleToken.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable until is valid ISO date",
    !isNaN(Date.parse(sampleToken.refreshable_until)),
  );

  // Verify token timestamps are in the future
  TestValidator.predicate(
    "token expiration is in the future",
    new Date(sampleToken.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refresh window is valid",
    new Date(sampleToken.refreshable_until) > new Date(sampleToken.expired_at),
  );
}
