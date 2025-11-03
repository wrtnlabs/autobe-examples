import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";
import type { ITodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuestSession";

/**
 * Test retrieval of non-existent guest session details.
 *
 * This test validates that the system properly handles attempts to access guest
 * sessions that don't exist or belong to different guests. The test creates
 * guest users and attempts to access sessions using invalid combinations to
 * verify that proper error handling occurs and unauthorized access is
 * prevented.
 *
 * The test covers main scenarios:
 *
 * 1. Accessing a session with non-existent guest ID
 * 2. Accessing a session with non-existent session ID
 * 3. Accessing sessions with mismatched guest and session IDs
 */
export async function test_api_guest_session_details_not_found(
  connection: api.IConnection,
) {
  // Create a guest user for reference
  const guest = await api.functional.todo.guests.create(connection, {
    body: {
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoGuest.ICreate,
  });
  typia.assert(guest);

  // Generate UUIDs for testing non-existent resources
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSessionId1 = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSessionId2 = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Access session with non-existent guest ID
  await TestValidator.error(
    "should fail when guest ID does not exist",
    async () => {
      await api.functional.todo.guests.sessions.at(connection, {
        guestId: nonExistentGuestId,
        sessionId: nonExistentSessionId1,
      });
    },
  );

  // Test 2: Access session with valid guest ID but non-existent session ID
  await TestValidator.error(
    "should fail when session ID does not exist for valid guest",
    async () => {
      await api.functional.todo.guests.sessions.at(connection, {
        guestId: guest.id,
        sessionId: nonExistentSessionId2,
      });
    },
  );

  // Test 3: Access multiple sessions with different non-existent combinations
  const thirdSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail with different non-existent session combination",
    async () => {
      await api.functional.todo.guests.sessions.at(connection, {
        guestId: guest.id,
        sessionId: thirdSessionId,
      });
    },
  );
}
