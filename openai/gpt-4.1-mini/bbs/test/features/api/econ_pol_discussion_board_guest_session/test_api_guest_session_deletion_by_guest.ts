import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import type { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";

export async function test_api_guest_session_deletion_by_guest(
  connection: api.IConnection,
) {
  // 1. Authenticate as a guest to create user context for session operations
  const guestAuthorized: IEconPolDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        username: `guest${RandomGenerator.alphaNumeric(6)}`,
        href: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
        referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(10)}`,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: `Mozilla/5.0 (compatible; TestBot/${RandomGenerator.alphabets(3)})`,
      } satisfies IEconPolDiscussionBoardGuest.ICreate,
    });
  typia.assert(guestAuthorized);
  TestValidator.predicate(
    "Guest user has valid JWT token",
    typeof guestAuthorized.token.access === "string" &&
      guestAuthorized.token.access.length > 0,
  );

  // 2. Create a new guest user
  const guestUser: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      {
        body: {
          username: `guestUser${RandomGenerator.alphaNumeric(5)}`,
          href: `https://example.com/guestUser/${RandomGenerator.alphaNumeric(8)}`,
          referrer: `https://referrer.com/guestUser/${RandomGenerator.alphaNumeric(8)}`,
          ip: typia.random<string & tags.Format<"ipv4">>(),
          user_agent: `Mozilla/5.0 (compatible; TestBot/${RandomGenerator.alphaNumeric(3)})`,
        } satisfies IEconPolDiscussionBoardGuest.ICreate,
      },
    );
  typia.assert(guestUser);
  TestValidator.predicate(
    "Created guest user has a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      guestUser.id,
    ),
  );

  // 3. Create a guest session record for the guest
  const sessionCreateBody = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: `https://example.com/session/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://referrer.com/session/${RandomGenerator.alphaNumeric(6)}`,
    expired_at: null,
  } satisfies IEconPolDiscussionBoardGuestSession.ICreate;
  const guestSession: IEconPolDiscussionBoardGuestSession =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.sessions.create(
      connection,
      {
        guestId: guestUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(guestSession);
  TestValidator.equals(
    "Guest session is linked to correct guest user",
    guestSession.econ_pol_discussion_board_guest_id,
    guestUser.id,
  );

  // 4. Delete the guest session record
  await api.functional.econPolDiscussionBoard.guest.econPolDiscussionBoardGuests.sessions.erase(
    connection,
    {
      guestId: guestUser.id,
      id: guestSession.id,
    },
  );

  // 5. Try to delete the same session again to ensure it no longer exists
  await TestValidator.error(
    "Deleting deleted session should fail",
    async () => {
      await api.functional.econPolDiscussionBoard.guest.econPolDiscussionBoardGuests.sessions.erase(
        connection,
        {
          guestId: guestUser.id,
          id: guestSession.id,
        },
      );
    },
  );
}
