import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import type { IEconomicDiscussionGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuestSession";

/**
 * Test error handling when attempting to retrieve a guest session that doesn't
 * exist.
 *
 * This test validates the system's behavior when attempting to access a
 * non-existent guest session. It ensures proper error handling and security
 * measures are in place to prevent session enumeration attacks and provide
 * appropriate feedback for invalid session access attempts.
 *
 * The test follows this workflow:
 *
 * 1. Create a guest user account for authentication context
 * 2. Generate a valid but non-existent session ID
 * 3. Attempt to retrieve the non-existent session
 * 4. Verify the system returns an appropriate error response
 *
 * This validation is crucial for security testing as it ensures the system
 * properly handles unauthorized session access attempts and doesn't expose
 * sensitive information about session existence.
 */
export async function test_api_guest_session_retrieval_session_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create a guest user to establish authentication context
  const guestUser = await api.functional.auth.guest.join(connection, {
    body: {
      username: RandomGenerator.name(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    } satisfies IEconomicDiscussionGuest.ICreate,
  });
  typia.assert(guestUser);

  // Step 2: Generate a valid but non-existent session ID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve the non-existent session and verify error handling
  await TestValidator.error(
    "retrieving non-existent guest session should fail",
    async () => {
      await api.functional.economicDiscussion.guests.sessions.at(connection, {
        guestId: guestUser.id,
        sessionId: nonExistentSessionId,
      });
    },
  );
}
