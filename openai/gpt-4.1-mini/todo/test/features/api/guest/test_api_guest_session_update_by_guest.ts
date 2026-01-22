import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { prepare_random_todo_app_guest_session } from "../../../prepare/prepare_random_todo_app_guest_session";
import { generate_random_todo_app_guests_sessions_create } from "../../../generate/generate_random_todo_app_guests_sessions_create";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
/**
 * E2E test for guest session update by the authenticated guest user.
 *
 * This test covers the entire lifecycle of guest session update:
 *
 * 1. Guest user registration via join endpoint.
 * 2. Creating initial guest session linked to the guest user.
 * 3. Updating the guest session with new IP, href, and referrer.
 * 4. Validating that update reflects correctly and session data is consistent.
 *
 * The test ensures:
 *
 * - Authentication tokens are correctly handled.
 * - Session creation and update APIs behave as expected.
 * - Updated session matches sent update data.
 *
 * Connection isolation pattern is followed strictly for guest user connection.
 *
 * @param connection Base connection object to the API host.
 */
export async function test_api_guest_session_update_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate guest user and obtain connection with token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: { guestIdentifier: RandomGenerator.alphaNumeric(16) } },
  );
  typia.assert(guestAuthorized);
  // Step 2: Create a new guest session for the authorized guest
  const initialSession: ITodoAppGuestSession =
    await generate_random_todo_app_guests_sessions_create(guestConnection, {
      params: { guestId: guestAuthorized.id },
      body: {
        accessToken: guestAuthorized.token.access,
        refreshToken: guestAuthorized.token.refresh,
        ip: RandomGenerator.alphaNumeric(15),
        userAgent: `Mozilla/5.0 (TestAgent) AppleWebKit/537.36 Chrome/99.0.1234.56 Safari/537.36`,
        deviceInfo: `Device-${RandomGenerator.alphaNumeric(8)}`,
        expiresAt: guestAuthorized.token.expired_at,
      } satisfies ITodoAppGuestSession.ICreate,
    });
  typia.assert(initialSession);
  // Step 3: Prepare update payload with new session information
  const updateBody = {
    ip: RandomGenerator.alphaNumeric(15),
    href: `https://${RandomGenerator.alphaNumeric(8)}.example.com/page`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.referrer.com`,
    expired_at: null, // Explicit null as per schema for no expiration
  } satisfies ITodoAppGuestSession.IUpdate;
  // Step 4: Update the guest session
  const updatedSession: ITodoAppGuestSession =
    await api.functional.todoApp.guest.guests.sessions.update(guestConnection, {
      guestId: guestAuthorized.id,
      sessionId: initialSession.id,
      body: updateBody,
    });
  typia.assert(updatedSession);
  // Step 5: Validate that updated fields match update request
  TestValidator.equals(
    "updated session belongs to the guest",
    updatedSession.guest_id,
    guestAuthorized.id,
  );
  TestValidator.equals("ip updated", updatedSession.ip, updateBody.ip);
  TestValidator.equals("href updated", updatedSession.href, updateBody.href);
  TestValidator.equals(
    "referrer updated",
    updatedSession.referrer,
    updateBody.referrer,
  );
  TestValidator.equals(
    "expired_at is null",
    updatedSession.expired_at,
    updateBody.expired_at,
  );
}
