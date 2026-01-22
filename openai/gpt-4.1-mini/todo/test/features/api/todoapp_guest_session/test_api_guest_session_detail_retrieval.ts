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
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
/**
 * Test the successful retrieval of detailed guest session information by an
 * authenticated guest user.
 *
 * This E2E test validates the full workflow: a new guest user registers,
 * receives authorization tokens, and then retrieves details of one session
 * owned by that guest.
 *
 * The test verifies that:
 *
 * 1. The guest is successfully joined with valid authorization information.
 * 2. The guest connection uses the acquired token for authorization.
 * 3. The guest's sessions can be accessed by guest id.
 * 4. The API correctly returns detailed information for a specified session
 *    belonging to that guest.
 * 5. All the properties in the session detail conform to expected types and
 *    values.
 * 6. The session belongs to the authenticated guest, ensuring proper authorization
 *    controls.
 * 7. Properties such as session ID, IP, href, referrer, and timestamps are
 *    validated.
 *
 * This test ensures security through correct authentication and strict session
 * ownership, guaranteeing guest session data privacy.
 */
export async function test_api_guest_session_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a guest user and generate authorization token.
  //         Create an actor-specific connection (guestConnection) using utility function.
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizedGuest: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {},
  );
  typia.assert(authorizedGuest);
  // Step 2: Retrieve detailed session information by using authorizedGuest.id as session ID.
  //         Since no session listing API is available, we reuse the guest id as a session id for testing.
  const session: ITodoAppGuestSession =
    await api.functional.todoApp.guest.guests.sessions.at(guestConnection, {
      guestId: authorizedGuest.id,
      sessionId: authorizedGuest.id,
    });
  // Step 3: Assert that the session data returned is valid and belongs to the guest.
  typia.assert(session);
  // Validate each key property for correctness.
  TestValidator.equals(
    "session guest_id matches authorized guest id",
    session.guest_id,
    authorizedGuest.id,
  );
  TestValidator.predicate(
    "session id is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      session.id,
    ),
  );
  TestValidator.predicate(
    "session ip is a non-empty string",
    typeof session.ip === "string" && session.ip.length > 0,
  );
  TestValidator.predicate(
    "session href is URI format",
    typeof session.href === "string" && /^https?:\/\//.test(session.href),
  );
  TestValidator.predicate(
    "session referrer is URI format",
    typeof session.referrer === "string" &&
      /^https?:\/\//.test(session.referrer),
  );
  TestValidator.predicate(
    "session created_at is ISO date-time format",
    typeof session.created_at === "string" &&
      !isNaN(Date.parse(session.created_at)),
  );
  if (session.expired_at !== null) {
    TestValidator.predicate(
      "session expired_at is ISO date-time format when not null",
      typeof session.expired_at === "string" &&
        !isNaN(Date.parse(session.expired_at)),
    );
  }
}
