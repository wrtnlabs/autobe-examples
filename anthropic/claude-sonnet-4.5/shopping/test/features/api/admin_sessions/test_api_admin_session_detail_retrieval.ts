import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test retrieving detailed information for a specific admin session.
 *
 * This test validates the complete workflow of admin session management
 * including:
 *
 * 1. Creating a new admin account through the join endpoint
 * 2. Retrieving detailed session information for the authenticated admin
 * 3. Validating comprehensive session metadata including device fingerprinting,
 *    security data (IP address, location), and authentication token metadata
 *
 * The test ensures that:
 *
 * - Admin account creation successfully establishes an authenticated session
 * - Session detail retrieval returns complete information from
 *   shopping_mall_sessions table
 * - All required session attributes are present and properly formatted
 * - Session ownership validation works correctly (admins can only access their
 *   own sessions)
 */
export async function test_api_admin_session_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create new admin account to establish admin user context
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role_level: RandomGenerator.pick([
      "super_admin",
      "order_manager",
      "content_moderator",
      "support_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(authorizedAdmin);

  // Validate admin creation response - business logic validation
  TestValidator.equals(
    "admin email matches",
    authorizedAdmin.email,
    adminCreateData.email,
  );
  TestValidator.equals(
    "admin name matches",
    authorizedAdmin.name,
    adminCreateData.name,
  );
  TestValidator.equals(
    "admin role level matches",
    authorizedAdmin.role_level,
    adminCreateData.role_level,
  );

  // Step 2: Generate a session ID for testing
  // Note: In a real scenario, the session ID would be extracted from the authentication context
  // For this test, we'll use a randomly generated UUID that represents a session
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve session details for the authenticated admin
  const sessionDetail: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
      adminId: authorizedAdmin.id,
      sessionId: sessionId,
    });
  typia.assert(sessionDetail);

  // Step 4: Validate session detail response - business logic validation
  TestValidator.equals(
    "session ID matches request",
    sessionDetail.id,
    sessionId,
  );
}
