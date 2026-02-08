import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval attempt of a non-existent guest session ID.
 *
 * - Setup: Authenticate as guest by joining
 * - Action: Call GET /discussionBoard/guest/guestSessions/{id} with a non-existing UUID
 * - Validation: Expect a 404 error and relevant message
 */
export async function test_api_guest_guest_session_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Authenticate as a guest to get token
  await authorize_guest_join(guestConnection, { body: {} });
  // Use a random UUID that likely does not exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Call guestSession.at with non-existent ID and expect 404 error
  await TestValidator.httpError(
    "guest session retrieval not found",
    404,
    async () => {
      await api.functional.discussionBoard.guest.guestSessions.at(
        guestConnection,
        {
          id: nonExistentSessionId,
        },
      );
    },
  );
}
