import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";

export async function test_api_notification_get_by_id_not_found_and_auth_boundary(
  connection: api.IConnection,
) {
  /**
   * Validate auth boundary and non-existent notification fetch.
   *
   * Steps
   *
   * 1. Unauthenticated: GET detail with a random UUID should error (auth required)
   * 2. Join as a new member
   * 3. Authenticated: GET the same random UUID should error (not found under this
   *    user)
   */

  // Prepare a random valid UUID to probe with
  const unknownId = typia.random<string & tags.Format<"uuid">>();

  // 1) Unauthenticated call using a clean connection clone without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot fetch notification detail",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.at(unauthConn, {
        notificationId: unknownId,
      });
    },
  );

  // 2) Join as a new member to obtain auth token (SDK attaches token automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 3) Authenticated call with the same UUID should error (non-existent for this user)
  await TestValidator.error(
    "non-existent notification id returns error for new member",
    async () => {
      await api.functional.econDiscuss.member.me.notifications.at(connection, {
        notificationId: unknownId,
      });
    },
  );
}
