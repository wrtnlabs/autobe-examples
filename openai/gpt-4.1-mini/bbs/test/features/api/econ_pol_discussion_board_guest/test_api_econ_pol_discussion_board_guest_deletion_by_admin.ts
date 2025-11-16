import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";

export async function test_api_econ_pol_discussion_board_guest_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1. Admin joins and obtains authentication token
  const adminBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;

  const admin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // Step 2. Create a new guest user
  const guestCreateBody = {
    username: RandomGenerator.alphaNumeric(8),
    href: `https://www.example.com/articles/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://www.referrer.com/${RandomGenerator.alphaNumeric(6)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    user_agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/${RandomGenerator.alphaNumeric(3)}.36 (KHTML, like Gecko) Chrome/${RandomGenerator.alphaNumeric(3)}.0.0.0 Safari/${RandomGenerator.alphaNumeric(3)}.36`,
  } satisfies IEconPolDiscussionBoardGuest.ICreate;

  const guest: IEconPolDiscussionBoardGuest =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardGuests.create(
      connection,
      { body: guestCreateBody },
    );
  typia.assert(guest);

  // Step 3. Admin deletes the guest user with the guest ID
  await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardGuests.erase(
    connection,
    { guestId: guest.id },
  );

  // There is no response body but the operation must succeed without errors
  // Step 4. Validate unauthorized deletion attempt
  // Create a new unauthenticated connection (headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized users cannot delete guests",
    async () => {
      await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardGuests.erase(
        unauthConn,
        { guestId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
