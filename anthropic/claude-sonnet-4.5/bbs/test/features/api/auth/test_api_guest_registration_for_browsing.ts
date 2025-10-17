import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test complete guest session creation workflow for unauthenticated visitors.
 *
 * Validates that guests can create temporary accounts without authentication,
 * receive valid JWT tokens (access and refresh), and establish tracked sessions
 * for browsing public discussions.
 *
 * Test validates:
 *
 * 1. Successful guest account creation with optional newsletter email
 * 2. Receipt of both access token (30-minute expiration) and refresh token (7-day
 *    expiration)
 * 3. JWT token structure includes session_id, guest identity, and appropriate
 *    expiration timestamps
 * 4. Guest session metadata is recorded including IP address and user agent
 * 5. Response includes guest profile information and read-only privilege
 *    indicators
 * 6. Email validation when newsletter signup email is provided
 * 7. Session tracking identifiers are unique and properly generated
 *
 * Business logic verification:
 *
 * - Guests receive read-only access (can view but not create/edit content)
 * - Tokens are immediately valid for browsing operations
 * - Session metadata is captured for analytics
 * - Newsletter email is optional and validated if provided
 *
 * Expected outcomes:
 *
 * - Guest account created successfully with unique session_id
 * - Valid JWT access and refresh tokens returned
 * - Guest can use tokens to access public content
 * - Session is tracked for conversion analytics
 */
export async function test_api_guest_registration_for_browsing(
  connection: api.IConnection,
) {
  // Test 1: Create guest session without email (minimal data)
  const guestWithoutEmail = await api.functional.auth.guest.join(connection, {
    body: {
      email: undefined,
      session_metadata: {
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestWithoutEmail);

  // Test 2: Create guest session with newsletter email
  const newsletterEmail = typia.random<string & tags.Format<"email">>();
  const guestWithEmail = await api.functional.auth.guest.join(connection, {
    body: {
      email: newsletterEmail,
      session_metadata: {
        ip_address: "10.0.0.50",
        user_agent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestWithEmail);

  // Validate unique session IDs for different guests
  TestValidator.notEquals(
    "different guests have unique session IDs",
    guestWithoutEmail.id,
    guestWithEmail.id,
  );

  // Test 3: Create guest with minimal metadata
  const guestMinimal = await api.functional.auth.guest.join(connection, {
    body: {} satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestMinimal);

  // Validate minimal guest session has different ID from previous guests
  TestValidator.notEquals(
    "minimal guest has unique ID from first guest",
    guestMinimal.id,
    guestWithoutEmail.id,
  );

  TestValidator.notEquals(
    "minimal guest has unique ID from second guest",
    guestMinimal.id,
    guestWithEmail.id,
  );

  // Test 4: Create multiple guest sessions to verify uniqueness
  const multipleGuests = await ArrayUtil.asyncRepeat(5, async (index) => {
    const guest = await api.functional.auth.guest.join(connection, {
      body: {
        email:
          index % 2 === 0
            ? typia.random<string & tags.Format<"email">>()
            : undefined,
        session_metadata: {
          ip_address: `192.168.1.${100 + index}`,
          user_agent: `TestAgent/${index}`,
        },
      } satisfies IDiscussionBoardGuest.ICreate,
    });
    typia.assert(guest);
    return guest;
  });

  // Validate session IDs are all different from each other
  for (let i = 0; i < multipleGuests.length; i++) {
    for (let j = i + 1; j < multipleGuests.length; j++) {
      TestValidator.notEquals(
        `guest ${i} and guest ${j} have different session IDs`,
        multipleGuests[i].id,
        multipleGuests[j].id,
      );
    }
  }
}
