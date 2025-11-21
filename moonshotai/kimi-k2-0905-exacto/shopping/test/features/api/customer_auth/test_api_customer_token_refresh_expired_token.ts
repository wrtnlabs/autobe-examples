import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test token refresh rejection with expired refresh tokens.
 *
 * Validates that expired refresh tokens trigger appropriate authentication
 * errors requiring fresh customer login credentials. Ensures that security
 * standards are maintained by rejecting invalid refresh token attempts.
 * Verifies that consistent error handling provides clear authentication status
 * for customer session management.
 *
 * This test validates the token refresh security validation by testing various
 * invalid refresh token scenarios including expired, malformed, empty, and
 * invalid format tokens. The platform should maintain consistent error handling
 * and security protocols for all invalid token scenarios.
 */
export async function test_api_customer_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Test vector 1: Test with invalid token format (malformed JWT-like structure)
  const invalidTokenRequest: IShoppingMallCustomer.IRefresh = {
    refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload",
  };

  await TestValidator.error(
    "malformed JWT refresh token format should be rejected",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: invalidTokenRequest,
      });
    },
  );

  // Test vector 2: Test with empty refresh token
  const emptyTokenRequest: IShoppingMallCustomer.IRefresh = {
    refresh_token: "",
  };

  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: emptyTokenRequest,
      });
    },
  );

  // Test vector 3: Test with syntactically invalid token format
  const syntacticallyInvalidRequest: IShoppingMallCustomer.IRefresh = {
    refresh_token: "not_a_valid_token_format_structure",
  };

  await TestValidator.error(
    "syntactically invalid token format should be rejected",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: syntacticallyInvalidRequest,
      });
    },
  );

  // Test vector 4: Test with random alphanumeric string (simulating expired token)
  const expiredTokenRequest: IShoppingMallCustomer.IRefresh = {
    refresh_token: RandomGenerator.alphaNumeric(128),
  };

  await TestValidator.error(
    "expired/invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: expiredTokenRequest,
      });
    },
  );

  // Test vector 5: Test with shorter token (potentially incomplete JWT)
  const shortTokenRequest: IShoppingMallCustomer.IRefresh = {
    refresh_token: RandomGenerator.alphaNumeric(32),
  };

  await TestValidator.error(
    "short/incomplete refresh token should be rejected",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: shortTokenRequest,
      });
    },
  );

  // Test vector 6: Test concurrent refresh attempts with same invalid token
  await TestValidator.error(
    "concurrent invalid token refresh maintains security integrity",
    async () => {
      // Simulate concurrent refresh attempts with same expired token
      const expiredToken = RandomGenerator.alphaNumeric(128);

      await Promise.all([
        api.functional.auth.customer.refresh(connection, {
          body: { refresh_token: expiredToken },
        }),
        api.functional.auth.customer.refresh(connection, {
          body: { refresh_token: expiredToken },
        }),
        api.functional.auth.customer.refresh(connection, {
          body: { refresh_token: expiredToken },
        }),
      ]);
    },
  );
}
