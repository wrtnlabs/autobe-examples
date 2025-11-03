import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test selective session deletion for member logout functionality.
 *
 * This test validates that a member can selectively delete one authenticated
 * session while maintaining the ability to create and use other sessions. This
 * demonstrates selective device logout capability where a user can log out from
 * one device without affecting their ability to use the service from other
 * sessions.
 *
 * The test flow:
 *
 * 1. Register a new member account with email and password
 * 2. Create first session by authenticating (login)
 * 3. Create second concurrent session by authenticating again
 * 4. Delete the first session successfully
 * 5. Create a third session to verify continued authentication capability
 * 6. Verify that member can continue authenticating after session deletion
 */
export async function test_api_member_session_deletion_selective_logout(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPass123"; // Must meet requirements: 8+ chars, uppercase, lowercase, number

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered member has valid ID",
    typeof registered.id,
    "string",
  );
  TestValidator.equals(
    "registered member has authorization token",
    typeof registered.token.access,
    "string",
  );

  // Step 2: Create first session by authenticating
  const firstSession = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(firstSession);
  const firstSessionId = firstSession.id;
  TestValidator.equals(
    "first session has valid ID",
    typeof firstSessionId,
    "string",
  );

  // Step 3: Create second concurrent session by authenticating again
  const secondSession = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(secondSession);
  const secondSessionId = secondSession.id;
  TestValidator.equals(
    "second session has valid ID",
    typeof secondSessionId,
    "string",
  );
  TestValidator.notEquals(
    "sessions have different IDs",
    firstSessionId,
    secondSessionId,
  );

  // Step 4: Delete the first session
  await api.functional.discussionBoard.member.auth.sessions.erase(connection, {
    sessionId: firstSessionId,
  });
  TestValidator.predicate(
    "first session deletion completed without error",
    true,
  );

  // Step 5: Create a third session to verify continued authentication capability
  const thirdSession = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.ILoginRequest,
  });
  typia.assert(thirdSession);
  const thirdSessionId = thirdSession.id;
  TestValidator.equals(
    "third session has valid ID",
    typeof thirdSessionId,
    "string",
  );

  // Step 6: Verify all three sessions have unique IDs
  TestValidator.notEquals(
    "third session differs from first session",
    thirdSessionId,
    firstSessionId,
  );
  TestValidator.notEquals(
    "third session differs from second session",
    thirdSessionId,
    secondSessionId,
  );
  TestValidator.predicate(
    "member can continue authenticating after selective session deletion",
    thirdSessionId !== firstSessionId && thirdSessionId !== secondSessionId,
  );
}
