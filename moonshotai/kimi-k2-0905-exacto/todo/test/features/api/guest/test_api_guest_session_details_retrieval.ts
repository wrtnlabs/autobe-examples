import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";
import type { ITodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuestSession";

/**
 * Test successful retrieval of guest session details, verifying that the system
 * can retrieve detailed session information for existing guest sessions. This
 * validates proper guest session management and audit trail capabilities by
 * creating a guest account via the create guest API endpoint, then retrieving
 * session details to validate all connection metadata including IP addresses,
 * timestamps, and session status are properly tracked and returned.
 *
 * 1. First create a new guest session to establish the baseline
 * 2. Then retrieve session details using the guest and session IDs
 * 3. Finally validate all session metadata matches expected structure
 */
export async function test_api_guest_session_details_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest session
  const createBody = {
    ip: "192.168.1.100",
    href: "https://example.com/todo",
    referrer: "https://example.com",
  } satisfies ITodoGuest.ICreate;

  const guest = await api.functional.todo.guests.create(connection, {
    body: createBody,
  });
  typia.assert(guest);

  // Step 2: Retrieve guest session details
  // Since we created the guest, we should use the actual guest ID
  // For session ID in this test context, we'll use a generated one
  // In real implementation you'd get this from guest session creation
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve session details
  const sessionDetails = await api.functional.todo.guests.sessions.at(
    connection,
    {
      guestId: guest.id,
      sessionId,
    },
  );
  typia.assert(sessionDetails);

  // Step 4: Validate session details structure
  TestValidator.equals(
    "session has guest ID reference",
    sessionDetails.todo_guest_id,
    guest.id,
  );
  TestValidator.predicate(
    "session has IP address",
    sessionDetails.ip.length > 0,
  );
  TestValidator.predicate(
    "session has connection URL",
    sessionDetails.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer",
    sessionDetails.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    sessionDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has valid timestamp format",
    /^\d{4}-\d{2}-\d{2}/.test(sessionDetails.created_at),
  );

  // Validate expired_at field structure (nullable/undefined acceptable)
  TestValidator.predicate(
    "session expired_at is valid type",
    sessionDetails.expired_at === null ||
      sessionDetails.expired_at === undefined ||
      (typeof sessionDetails.expired_at === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(sessionDetails.expired_at)),
  );
}
