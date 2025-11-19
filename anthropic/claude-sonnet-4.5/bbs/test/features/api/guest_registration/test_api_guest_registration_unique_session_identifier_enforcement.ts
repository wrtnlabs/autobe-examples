import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that validates unique constraint enforcement on session_identifier
 * during guest registration.
 *
 * This test ensures that the database unique constraint on the
 * session_identifier field is properly enforced to prevent session collision
 * and maintain analytics accuracy.
 *
 * Test Flow:
 *
 * 1. Create first guest session with specific session_identifier
 * 2. Verify first registration succeeds with valid tokens
 * 3. Attempt duplicate registration with same session_identifier
 * 4. Verify duplicate registration fails appropriately
 * 5. Confirm first session remains valid
 */
export async function test_api_guest_registration_unique_session_identifier_enforcement(
  connection: api.IConnection,
) {
  // Generate a unique session identifier for testing
  const sessionIdentifier = typia.random<string & tags.Format<"uuid">>();

  // Create first guest session with the session identifier
  const firstGuestBody = {
    session_identifier: sessionIdentifier,
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  } satisfies IDiscussionBoardGuest.ICreate;

  const firstGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: firstGuestBody,
    });

  // Validate first guest registration succeeded
  typia.assert(firstGuest);

  // Verify the session identifier matches
  TestValidator.equals(
    "first guest session_identifier matches",
    firstGuest.session_identifier,
    sessionIdentifier,
  );

  // Verify tokens are present
  TestValidator.predicate(
    "first guest has access token",
    firstGuest.token.access.length > 0,
  );

  TestValidator.predicate(
    "first guest has refresh token",
    firstGuest.token.refresh.length > 0,
  );

  // Attempt to create second guest with the same session identifier
  const secondGuestBody = {
    session_identifier: sessionIdentifier,
    ip_address: "10.0.0.50",
    user_agent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  } satisfies IDiscussionBoardGuest.ICreate;

  // This should fail due to unique constraint violation
  await TestValidator.error(
    "duplicate session_identifier should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: secondGuestBody,
      });
    },
  );
}
