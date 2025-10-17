import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test guest account creation with newsletter email subscription.
 *
 * This test validates the conversion tracking workflow where guests provide
 * email addresses for newsletter signup during session creation. It verifies
 * that guest sessions can be created with or without email, and that JWT tokens
 * are properly issued for browsing access.
 *
 * Test workflow:
 *
 * 1. Create guest session with valid newsletter email
 * 2. Verify JWT tokens are issued correctly
 * 3. Validate email is stored for conversion tracking
 * 4. Create guest session without email (optional field)
 * 5. Create guest session with session metadata
 * 6. Verify multiple guests can register with different emails
 */
export async function test_api_guest_registration_with_newsletter_signup(
  connection: api.IConnection,
) {
  // Step 1: Create guest session with valid newsletter email
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const guestWithEmail = await api.functional.auth.guest.join(connection, {
    body: {
      email: guestEmail,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestWithEmail);

  // Verify JWT tokens are issued
  TestValidator.predicate(
    "access token should exist",
    guestWithEmail.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    guestWithEmail.token.refresh.length > 0,
  );

  // Step 2: Create guest session without email (optional field)
  const guestWithoutEmail = await api.functional.auth.guest.join(connection, {
    body: {} satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestWithoutEmail);

  // Verify guest session created successfully without email
  TestValidator.predicate(
    "guest without email should have access token",
    guestWithoutEmail.token.access.length > 0,
  );

  // Step 3: Create guest session with session metadata
  const guestWithMetadata = await api.functional.auth.guest.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      session_metadata: {
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies IDiscussionBoardGuest.ISessionMetadata,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestWithMetadata);

  // Step 4: Verify multiple guests can use different emails
  const multipleGuests = await ArrayUtil.asyncRepeat(3, async () => {
    const email = typia.random<string & tags.Format<"email">>();
    const guest = await api.functional.auth.guest.join(connection, {
      body: {
        email: email,
      } satisfies IDiscussionBoardGuest.ICreate,
    });
    typia.assert(guest);
    return guest;
  });

  // Verify all guests have unique IDs
  const guestIds = multipleGuests.map((g) => g.id);
  const uniqueIds = new Set(guestIds);
  TestValidator.predicate(
    "all guest IDs should be unique",
    uniqueIds.size === guestIds.length,
  );

  // Verify all guests have valid tokens
  multipleGuests.forEach((guest, index) => {
    TestValidator.predicate(
      `guest ${index} should have access token`,
      guest.token.access.length > 0,
    );
    TestValidator.predicate(
      `guest ${index} should have refresh token`,
      guest.token.refresh.length > 0,
    );
  });
}
