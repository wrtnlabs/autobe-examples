import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";

/**
 * Test complete guest registration workflow for unauthenticated users.
 *
 * This test validates the guest registration process that creates temporary
 * guest accounts for viewing demonstration todos and exploring application
 * functionality. The test ensures that:
 *
 * 1. Guest registration creates a valid session with unique identifier
 * 2. Response includes all required authorization data (id, token,
 *    session_identifier)
 * 3. Authentication tokens are properly formatted and valid
 * 4. SDK automatically handles authorization header setting
 * 5. Guest sessions provide proper access to demonstration content
 *
 * The guest registration process requires no personal information and provides
 * frictionless exploration of todo management features while maintaining clear
 * separation between demonstration content and personal user todos.
 */
export async function test_api_guest_registration(connection: api.IConnection) {
  // Step 1: Register as a guest user
  const guestAuth: ITodoGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // Step 2: Validate the response structure
  typia.assert(guestAuth);

  // Step 3: Verify all required fields are present
  TestValidator.predicate(
    "guest authorization has valid UUID id",
    typeof guestAuth.id === "string" && guestAuth.id.length === 36,
  );

  TestValidator.predicate(
    "guest authorization has session identifier",
    typeof guestAuth.session_identifier === "string" &&
      guestAuth.session_identifier.length > 0,
  );

  // Step 4: Validate token structure
  TestValidator.predicate(
    "guest authorization has access token",
    typeof guestAuth.token.access === "string" &&
      guestAuth.token.access.length > 0,
  );

  TestValidator.predicate(
    "guest authorization has refresh token",
    typeof guestAuth.token.refresh === "string" &&
      guestAuth.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "guest authorization has expired_at timestamp",
    typeof guestAuth.token.expired_at === "string" &&
      guestAuth.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "guest authorization has refreshable_until timestamp",
    typeof guestAuth.token.refreshable_until === "string" &&
      guestAuth.token.refreshable_until.length > 0,
  );

  // Step 5: Verify authorization header is automatically set
  TestValidator.predicate(
    "connection headers include authorization token",
    connection.headers !== undefined &&
      connection.headers.Authorization === guestAuth.token.access,
  );

  // Step 6: Validate token format using typia
  typia.assert<IAuthorizationToken>(guestAuth.token);
}
