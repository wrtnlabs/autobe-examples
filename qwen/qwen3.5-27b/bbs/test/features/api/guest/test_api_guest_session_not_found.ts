import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a non-existent guest session.
 * 1. Guest joins to establish authentication
 * 2. Generate a random UUID for non-existent session
 * 3. Attempt to retrieve the session
 * 4. Verify 404 Not Found error is thrown
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Generate a random UUID for non-existent session
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify 404 error when retrieving non-existent session
  await TestValidator.httpError(
    "should return 404 for non-existent session",
    404,
    async () =>
      await api.functional.discussionBoard.guest.sessions.at(guestConnection, {
        sessionId: nonExistentSessionId,
      }),
  );
}
