import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

export async function test_api_guest_user_identity_not_found(
  connection: api.IConnection,
) {
  // 1. Establish a guestUser session via /auth/guestUser/join
  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: typia.random<ITodoAppGuestUserJoin.IRequest>(),
    });
  typia.assert(authorized);

  const realGuestId: string & tags.Format<"uuid"> = authorized.guest.id;

  // 2. Generate a UUID that does not match the real guest id
  let missingGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  for (let i = 0; i < 5 && missingGuestId === realGuestId; ++i) {
    missingGuestId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existent guestUserId must differ from real guest id",
    missingGuestId,
    realGuestId,
  );

  // 3. Invoke GET with the non-existent UUID and expect an error
  await TestValidator.error(
    "requesting non-existent guest user identity should fail",
    async () => {
      await api.functional.todoApp.guestUser.guestUsers.at(connection, {
        guestUserId: missingGuestId,
      });
    },
  );

  // 4. Optional sanity check: existing id must succeed
  const existing: ITodoAppGuestUser =
    await api.functional.todoApp.guestUser.guestUsers.at(connection, {
      guestUserId: realGuestId,
    });
  typia.assert(existing);

  TestValidator.equals(
    "existing guest user identity id must match joined guest id",
    existing.id,
    realGuestId,
  );
}
