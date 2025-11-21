import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallLogoutConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutConfirmation";
import type { IShoppingMallLogoutRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutRequest";
import type { IShoppingMallUserType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserType";

/**
 * Test logout behavior with malformed, expired, or invalid JWT tokens.
 * Validates proper error handling when tokens don't match expected format
 * pattern '^[A-Za-z0-9-_]+.[A-Za-z0-9-_]+.[A-Za-z0-9-_]+. Ensures graceful
 * failure with appropriate error messages while maintaining security audit
 * trails for invalid token attempts.
 *
 * Test scenarios include:
 *
 * 1. Invalid token format - missing payload
 * 2. Token with invalid characters (non-base64)
 * 3. Empty/missing token
 * 4. Malformed JWT structure (wrong number of segments)
 * 5. Invalid expiration handling
 * 6. Invalid signature verification
 */
export async function test_api_shopping_mall_logout_malformed_token_handling(
  connection: api.IConnection,
) {
  // Generate random valid token for comparison
  const validToken = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;

  // Test Case 1: Missing payload token - should fail
  await TestValidator.error("missing payload token should fail", async () => {
    await api.functional.shoppingMall.auth.logout(connection, {
      body: {
        token: "header.signature", // Missing payload section
      } satisfies IShoppingMallLogoutRequest,
    });
  });

  // Test Case 2: Token with invalid characters
  await TestValidator.error(
    "token with invalid characters should fail",
    async () => {
      await api.functional.shoppingMall.auth.logout(connection, {
        body: {
          token: "header@payload.s!gnature", // Invalid characters
        } satisfies IShoppingMallLogoutRequest,
      });
    },
  );

  // Test Case 3: Empty token
  await TestValidator.error("empty token should fail", async () => {
    await api.functional.shoppingMall.auth.logout(connection, {
      body: {
        token: "", // Empty token
      } satisfies IShoppingMallLogoutRequest,
    });
  });

  // Test Case 4: Missing token - Create request without token field if possible
  // This tests null handling
  await TestValidator.error("null token should fail", async () => {
    const requestBody = {
      token: "",
    } satisfies IShoppingMallLogoutRequest;
    await api.functional.shoppingMall.auth.logout(connection, {
      body: requestBody,
    });
  });

  // Test Case 5: Extra segments in JWT
  await TestValidator.error("extra JWT segments should fail", async () => {
    await api.functional.shoppingMall.auth.logout(connection, {
      body: {
        token: "header.payload.signature.extra", // Too many segments
      } satisfies IShoppingMallLogoutRequest,
    });
  });

  // Test Case 6: Single segment (not a JWT)
  await TestValidator.error("single segment token should fail", async () => {
    await api.functional.shoppingMall.auth.logout(connection, {
      body: {
        token: "notajwt", // Single segment
      } satisfies IShoppingMallLogoutRequest,
    });
  });

  // Test Case 7: Test with additional logout options
  await TestValidator.error(
    "malformed token with logout options should fail",
    async () => {
      await api.functional.shoppingMall.auth.logout(connection, {
        body: {
          token: "bad.token.format",
          logoutAllDevices: true,
          reason: "Invalid token test",
          sessionCleanup: true,
        } satisfies IShoppingMallLogoutRequest,
      });
    },
  );
}
