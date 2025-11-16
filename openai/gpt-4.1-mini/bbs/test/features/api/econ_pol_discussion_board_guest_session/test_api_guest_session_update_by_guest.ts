import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import type { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";

export async function test_api_guest_session_update_by_guest(
  connection: api.IConnection,
) {
  // 1. Guest join to authenticate and create guest user context
  const guestJoinBody = {
    username: RandomGenerator.name(3),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: `Mozilla/${RandomGenerator.alphaNumeric(3)}`,
    href: `https://example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IEconPolDiscussionBoardGuest.ICreate;

  const guestAuth: IEconPolDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestJoinBody });
  typia.assert(guestAuth);

  // 2. Create a actual guest user record
  const guestCreateBody = {
    username: guestJoinBody.username,
    ip: guestJoinBody.ip,
    user_agent: guestJoinBody.user_agent,
    href: guestJoinBody.href,
    referrer: guestJoinBody.referrer,
  } satisfies IEconPolDiscussionBoardGuest.ICreate;

  const guest: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      { body: guestCreateBody },
    );

  typia.assert(guest);
  TestValidator.equals(
    "guest id matches authorized user",
    guest.id,
    guestAuth.id,
  );

  // 3. Create a guest session record
  const sessionCreateBody = {
    ip: guest.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    href: guestJoinBody.href,
    referrer: guestJoinBody.referrer,
    expired_at: new Date(Date.now() + 60000).toISOString(),
  } satisfies IEconPolDiscussionBoardGuestSession.ICreate;

  const session: IEconPolDiscussionBoardGuestSession =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.sessions.create(
      connection,
      { guestId: guest.id, body: sessionCreateBody },
    );
  typia.assert(session);

  // 4. Update the guest session record (the main test)
  const sessionUpdateBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://updated.example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://updated.referrer.com/${RandomGenerator.alphaNumeric(8)}`,
    expires_at: new Date(Date.now() + 120000).toISOString(),
  } satisfies IEconPolDiscussionBoardGuestSession.IUpdate;

  const updatedSession: IEconPolDiscussionBoardGuestSession =
    await api.functional.econPolDiscussionBoard.guest.econPolDiscussionBoardGuests.sessions.update(
      connection,
      { guestId: guest.id, id: session.id, body: sessionUpdateBody },
    );
  typia.assert(updatedSession);

  TestValidator.equals("updated session id", updatedSession.id, session.id);
  TestValidator.equals(
    "updated guest id",
    updatedSession.econ_pol_discussion_board_guest_id,
    guest.id,
  );
  TestValidator.equals("updated ip", updatedSession.ip, sessionUpdateBody.ip);
  TestValidator.equals(
    "updated href",
    updatedSession.href,
    sessionUpdateBody.href,
  );
  TestValidator.equals(
    "updated referrer",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );
  TestValidator.equals(
    "updated expiredAt",
    updatedSession.expired_at,
    sessionUpdateBody.expires_at,
  );
}
