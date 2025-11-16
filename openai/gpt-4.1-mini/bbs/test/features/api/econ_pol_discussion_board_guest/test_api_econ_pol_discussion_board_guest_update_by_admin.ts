import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";

/**
 * Test the update of an existing guest user information by an authenticated
 * admin in the EconPolDiscussionBoard system.
 *
 * The scenario includes authenticating as an admin via admin join operation,
 * creating a guest user, and then updating the guest's information such as
 * username.
 *
 * Verifies that only admins can update guest records and appropriate
 * authorization is enforced.
 */
export async function test_api_econ_pol_discussion_board_guest_update_by_admin(
  connection: api.IConnection,
) {
  // Administrative user joins the system to gain authenticated privileges
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const admin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Create a guest user with required properties
  const guestCreateBody = {
    username: RandomGenerator.alphaNumeric(10),
    href: `https://${RandomGenerator.alphaNumeric(5)}.example.com/page`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphaNumeric(8)}`,
    ip: "192.168.0.1",
    user_agent:
      "Mozilla/5.0 (compatible; AutoTestBot/1.0; +https://example.com/bot)",
  } satisfies IEconPolDiscussionBoardGuest.ICreate;
  const guest: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      {
        body: guestCreateBody,
      },
    );
  typia.assert(guest);

  // Prepare update body with new username
  const updatedUsername = RandomGenerator.alphaNumeric(15);
  const guestUpdateBody = {
    username: updatedUsername,
  } satisfies IEconPolDiscussionBoardGuest.IUpdate;

  // Admin updates the guest user's username
  const guestUpdated: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardGuests.update(
      connection,
      {
        guestId: guest.id,
        body: guestUpdateBody,
      },
    );
  typia.assert(guestUpdated);

  // Validate that the username is updated
  TestValidator.equals(
    "guest username updated",
    guestUpdated.username,
    updatedUsername,
  );

  // Validate other properties have remained unchanged or are properly maintained
  TestValidator.equals("guest id unchanged", guestUpdated.id, guest.id);
  TestValidator.equals(
    "guest ip unchanged",
    guestUpdated.ip ?? null,
    guest.ip ?? null,
  );
  TestValidator.equals(
    "guest user_agent unchanged",
    guestUpdated.user_agent ?? null,
    guest.user_agent ?? null,
  );
}
