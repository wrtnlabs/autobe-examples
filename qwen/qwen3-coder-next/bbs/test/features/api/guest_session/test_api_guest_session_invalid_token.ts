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

export async function test_api_guest_session_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest actor-specific connection and register a guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: `${RandomGenerator.pick([1, 10, 172, 192])}.${RandomGenerator.pick([0, 168])}.${RandomGenerator.pick([0, 1])}.${RandomGenerator.pick([1, 254])}`,
    },
  });
  typia.assert(guestSession);
  // Step 2: Verify the valid session works
  const validSession = await api.functional.discussionBoard.guest.sessions.at(
    guestConnection,
    { sessionId: guestSession.id },
  );
  typia.assert(validSession);
  // Step 3: Test with non-existent session ID
  await TestValidator.error("non-existent session", async () => {
    await api.functional.discussionBoard.guest.sessions.at(guestConnection, {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // Step 4: Test with malformed session ID
  await TestValidator.error("malformed session ID", async () => {
    await api.functional.discussionBoard.guest.sessions.at(guestConnection, {
      sessionId: "invalid-uuid-format",
    });
  });
}
