import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { prepare_random_todo_app_guest_session } from "../../../prepare/prepare_random_todo_app_guest_session";
import { generate_random_todo_app_guests_sessions_create } from "../../../generate/generate_random_todo_app_guests_sessions_create";
/**
 * Test scenario for guest session lifecycle in TodoApp.
 *
 * This test ensures that a guest session can be created with valid tokens and
 * metadata, then successfully deleted. It validates successful guest session
 * management and proper logout functionality.
 *
 * Steps involved:
 *
 * 1. Generate a random guestId (UUID format).
 * 2. Create a guest session for this guest using
 *    generate_random_todo_app_guests_sessions_create with realistic token and
 *    client metadata values.
 * 3. Validate the created session structure with typia.assert.
 * 4. Delete the created session by calling
 *    api.functional.todoApp.guests.sessions.erase.
 * 5. Confirm deletion by absence of errors.
 */
export async function test_api_guest_session_deletion_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Prepare isolated connections for guest session creation and deletion
  const guestCreateConnection: api.IConnection = { host: connection.host };
  const guestDeleteConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate random guestId (UUID string)
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Create a new guest session with random but valid data
  const createdSession: ITodoAppGuestSession =
    await generate_random_todo_app_guests_sessions_create(
      guestCreateConnection,
      {
        params: { guestId },
        body: {
          accessToken: RandomGenerator.alphaNumeric(32),
          refreshToken: RandomGenerator.alphaNumeric(32),
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour later
          ip: RandomGenerator.pick(["192.168.1.1", "10.0.0.1", "172.16.0.1"]),
          userAgent: "Mozilla/5.0 (compatible; TestBot/1.0)",
          deviceInfo: "UnitTestDevice",
        },
      },
    );
  typia.assert(createdSession);
  // Step 4: Delete the created guest session using erase endpoint
  await api.functional.todoApp.guests.sessions.erase(guestDeleteConnection, {
    guestId: createdSession.guest_id,
    sessionId: createdSession.id,
  });
  // Step 5: No error means success, test passes if reached here
  TestValidator.predicate("guest session deleted successfully", true);
}
