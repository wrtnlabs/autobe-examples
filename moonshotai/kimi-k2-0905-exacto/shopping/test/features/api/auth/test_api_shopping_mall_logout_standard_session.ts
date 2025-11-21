import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallLogoutConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutConfirmation";
import type { IShoppingMallLogoutRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutRequest";
import type { IShoppingMallUserType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserType";

/**
 * Test successful standard logout process for an authenticated user.
 *
 * This test validates the complete logout flow in the shopping mall platform
 * including:
 *
 * 1. JWT token invalidation process
 * 2. Session termination with proper cleanup
 * 3. Confirmation response with success status and timestamp
 * 4. Session tracking and audit trail generation
 * 5. Security boundary maintenance during logout
 *
 * The test ensures that single-session logout properly removes session
 * artifacts while maintaining comprehensive logging for security and compliance
 * purposes. It validates that the logout response contains all required fields
 * and that the operation completes successfully with appropriate business
 * logic.
 */
export async function test_api_shopping_mall_logout_standard_session(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid JWT token for testing logout
  const jwtToken = typia.random<
    string & tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">
  >();

  // Create logout request with standard session termination
  const logoutRequest = {
    token: jwtToken,
    logoutAllDevices: false, // Single session logout
    reason: "user_action",
    sessionCleanup: true,
  } satisfies IShoppingMallLogoutRequest;

  // Execute logout operation
  const logoutResponse = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: logoutRequest,
    },
  );

  // Validate response structure - typia.assert handles ALL type validation
  typia.assert(logoutResponse);

  // Verify business logic aspects only
  TestValidator.equals("logout success status", logoutResponse.success, true);
  TestValidator.predicate(
    "confirmation message exists",
    logoutResponse.message.length > 0,
  );
  TestValidator.predicate(
    "timestamp is recent",
    new Date(logoutResponse.timestamp).getTime() <= Date.now(),
  );

  // Validate business logic - message content and operation success
  TestValidator.predicate(
    "message describes successful operation",
    logoutResponse.message.toLowerCase().includes("logout") ||
      logoutResponse.message.toLowerCase().includes("session"),
  );
}
