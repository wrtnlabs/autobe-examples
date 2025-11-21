import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccessToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallSessionValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSessionValidation";
import type { IShoppingMallValidationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallValidationMetadata";

/**
 * Test session validation for anonymous guest users in shopping mall
 *
 * Validates that the authentication system properly handles guest sessions,
 * returning appropriate guest user context and temporary access permissions.
 * Confirms guest sessions maintain anonymous browsing capabilities while
 * tracking necessary session data for platform functionality.
 *
 * Test workflow:
 *
 * 1. Create anonymous guest session with realistic browsing metadata
 * 2. Extract guest authorization token for session validation
 * 3. Validate session using the access token
 * 4. Verify guest session context, permissions, and metadata
 * 5. Ensure appropriate access controls for anonymous users
 */
export async function test_api_validate_session_guest_user(
  connection: api.IConnection,
): Promise<void> {
  // Create realistic guest session data with current timestamp
  const guestSessionData = {
    href: "/shopping/products/category/electronics",
    referrer: "https://search-engine.com/shopping?query=electronics",
    session_id: RandomGenerator.alphaNumeric(40),
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.ICreate;

  // Step 1: Establish anonymous guest session
  const guestAuth = await api.functional.auth.guest.join(connection, {
    body: guestSessionData,
  });
  typia.assert(guestAuth);

  TestValidator.predicate(
    "guest authorization should have valid ID",
    typeof guestAuth.id === "string",
  );
  TestValidator.predicate(
    "guest authorization should have session ID",
    guestAuth.session_id.length > 10,
  );
  TestValidator.predicate(
    "guest authorization should have authorization token",
    guestAuth.token.access.length > 20,
  );

  // Step 2: Validate the guest session using access token
  const sessionValidation =
    await api.functional.shoppingMall.auth.validate_session.validateSession(
      connection,
      { body: { token: guestAuth.token.access } },
    );
  typia.assert(sessionValidation);

  TestValidator.equals(
    "session validation isValid",
    sessionValidation.isValid,
    true,
  );
  TestValidator.equals(
    "session validation userType",
    sessionValidation.userType,
    "customer",
  );
  TestValidator.equals(
    "guest has user ID",
    sessionValidation.userId !== null,
    true,
  );
  TestValidator.equals(
    "guest has session ID",
    sessionValidation.sessionId !== null,
    true,
  );
  TestValidator.predicate(
    "session expires in future",
    new Date(sessionValidation.expiresAt) > new Date(),
  );

  // Step 3: Validate guest-specific permissions and roles
  TestValidator.predicate(
    "permissions array is valid",
    Array.isArray(sessionValidation.permissions),
  );
  TestValidator.predicate(
    "roles array is valid",
    Array.isArray(sessionValidation.roles),
  );
  TestValidator.equals(
    "metadata is_valid",
    sessionValidation.metadata.is_valid,
    true,
  );
  TestValidator.predicate(
    "metadata structure is complete",
    sessionValidation.metadata &&
      typeof sessionValidation.metadata === "object",
  );

  // Step 4: Validate data consistency between auth and validation responses
  TestValidator.equals(
    "userId matches between auth and validation",
    sessionValidation.userId,
    guestAuth.id,
  );
  TestValidator.equals(
    "session ID consistency",
    sessionValidation.sessionId,
    guestAuth.id,
  );
  TestValidator.equals(
    "IP address from auth matches validation context",
    guestAuth.ip_address,
    guestSessionData.ip,
  );

  // Step 5: Validate guest browsing capabilities
  TestValidator.predicate(
    "permissions length is reasonable for guest",
    sessionValidation.permissions.length >= 0 &&
      sessionValidation.permissions.length <= 20,
  );
  TestValidator.predicate(
    "roles length is reasonable for guest",
    sessionValidation.roles.length >= 0 && sessionValidation.roles.length <= 10,
  );

  TestValidator.equals(
    "guest should have basic anonymous access",
    sessionValidation.isValid,
    true,
  );
}
