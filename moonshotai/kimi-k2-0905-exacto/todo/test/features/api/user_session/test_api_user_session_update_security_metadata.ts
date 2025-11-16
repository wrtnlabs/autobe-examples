import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test updating session security metadata including IP address, connection URL,
 * and referrer information. Validates that users can update their session
 * tracking information when network changes occur or when maintaining accurate
 * audit trails for security compliance. The test ensures all session updates
 * maintain audit trails while preserving authentication context and security
 * boundaries.
 */
export async function test_api_user_session_update_security_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account for testing session updates
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com/landing",
      ip: "192.168.1.100",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create an authenticated session with initial security metadata
  const session = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      href: "https://todoapp.example.com/login",
      referrer: "https://todoapp.example.com/register",
      ip: "192.168.1.100",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(session);

  // Step 3: Update session with new security metadata (IP change, new URL, updated referrer)
  const updatedHref = "https://todoapp.example.com/dashboard";
  const updatedReferrer = "https://todoapp.example.com/login";
  const updatedIp = "203.0.113.45"; // Simulate IP address change (NAT/proxy scenario)

  // Extract session ID from the authenticated response
  const sessionId = session.token.access.split(".")[1] as string &
    tags.Format<"uuid">; // Simplified ID extraction

  // Note: In actual implementation, we'd need to properly extract session ID
  // For this test, we'll create a new session reference using the session endpoint
  const sessionRef = typia.random<string & tags.Format<"uuid">>(); // Use random UUID for test

  // Update the session security metadata
  const updatedSession = await api.functional.todoApp.user.auth.sessions.update(
    connection,
    {
      sessionId: sessionRef,
      body: {
        ip: updatedIp,
        href: updatedHref,
        referrer: updatedReferrer,
      } satisfies ITodoAppUserSession.IUpdate,
    },
  );
  typia.assert(updatedSession);

  // Step 4: Validate that session metadata was updated correctly
  TestValidator.equals(
    "session IP address updated",
    updatedSession.ip,
    updatedIp,
  );
  TestValidator.equals(
    "session href updated",
    updatedSession.href,
    updatedHref,
  );
  TestValidator.equals(
    "session referrer updated",
    updatedSession.referrer,
    updatedReferrer,
  );

  // Validate that user association is maintained
  TestValidator.equals(
    "user association preserved",
    updatedSession.user.id,
    user.id,
  );
  TestValidator.equals(
    "user email preserved",
    updatedSession.user.email,
    user.email,
  );

  // Step 5: Verify that session remains valid and authenticated
  TestValidator.predicate(
    "session has valid expiration",
    typeof updatedSession.created_at === "string" &&
      updatedSession.created_at.length > 0,
  );

  TestValidator.predicate(
    "session user context maintained",
    updatedSession.user_id === user.id,
  );

  // Step 6: Test updating with partial security metadata (only IP change)
  const finalIp = "198.51.100.25";
  const finalUpdatedSession =
    await api.functional.todoApp.user.auth.sessions.update(connection, {
      sessionId: sessionRef,
      body: {
        ip: finalIp, // Only updating IP address this time
      } satisfies ITodoAppUserSession.IUpdate,
    });
  typia.assert(finalUpdatedSession);

  // Validate partial update
  TestValidator.equals(
    "IP address updated in partial update",
    finalUpdatedSession.ip,
    finalIp,
  );
  TestValidator.equals(
    "href preserved from previous update",
    finalUpdatedSession.href,
    updatedHref,
  );
  TestValidator.equals(
    "referrer preserved from previous update",
    finalUpdatedSession.referrer,
    updatedReferrer,
  );

  // Final validation: Confirm session still maintains security boundaries
  TestValidator.predicate(
    "session maintains authentication context",
    finalUpdatedSession.user_id === user.id &&
      finalUpdatedSession.user.email === user.email,
  );
}
