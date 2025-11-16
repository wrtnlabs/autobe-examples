import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import type { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";

/**
 * This E2E test verifies the guest session retrieval workflow in the
 * EconPolDiscussionBoard system. It performs the following steps: first,
 * creates a guest user by invoking the guest creation endpoint with required
 * fields such as a valid username and context URLs (href and referrer), along
 * with realistic IP and user agent strings. Next, it creates a guest session
 * for the newly created guest with required session data including IP, href,
 * and referrer. Finally, it retrieves the created session by its ID and guest
 * ID, validating that the retrieved session matches the initially created
 * session data exactly on IP, href, referrer, guestId, and timestamps
 * (created_at and expired_at). This ensures the entire lifecycle from guest to
 * session creation through retrieval is functional, type-safe, and validates
 * precise data integrity at each step. All data respects required types
 * including UUID string formats and URI formats for URLs.
 */
export async function test_api_guest_session_retrieval_by_guest(
  connection: api.IConnection,
) {
  // Step 1. Create a guest user with a realistic username, IP, user_agent, and context URLs
  const guestCreateBody = {
    username: RandomGenerator.name(1),
    ip: RandomGenerator.pick(["192.168.0.1", "203.0.113.5", "198.51.100.7"]),
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    href: `https://example.com/page/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referrer.example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IEconPolDiscussionBoardGuest.ICreate;
  const guest: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(guest);

  // Step 2. Create a guest session for the created guest with IP, href, and referrer
  const sessionCreateBody = {
    ip: guestCreateBody.ip ?? "203.0.113.5", // fallback IP if undefined
    href: guestCreateBody.href,
    referrer: guestCreateBody.referrer,
    expired_at: null,
  } satisfies IEconPolDiscussionBoardGuestSession.ICreate;
  const session: IEconPolDiscussionBoardGuestSession =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.sessions.create(
      connection,
      {
        guestId: guest.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // Step 3. Retrieve the created session by guestId and session id
  const sessionRetrieved: IEconPolDiscussionBoardGuestSession =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.sessions.at(
      connection,
      {
        guestId: guest.id,
        id: session.id,
      },
    );
  typia.assert(sessionRetrieved);

  // Step 4. Validate the retrieved session matches the created session
  TestValidator.equals(
    "guestId matches in session",
    sessionRetrieved.econ_pol_discussion_board_guest_id,
    guest.id,
  );
  TestValidator.equals("session id matches", sessionRetrieved.id, session.id);
  TestValidator.equals(
    "IP address matches",
    sessionRetrieved.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "href matches",
    sessionRetrieved.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer matches",
    sessionRetrieved.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.equals(
    "created_at matches",
    sessionRetrieved.created_at,
    session.created_at,
  );
  TestValidator.equals("expired_at matches", sessionRetrieved.expired_at, null);
}
