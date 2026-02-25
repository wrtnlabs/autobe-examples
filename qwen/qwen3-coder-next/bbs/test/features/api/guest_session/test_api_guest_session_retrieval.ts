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

export async function test_api_guest_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest session via join endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.discussionBoard.auth.guest.join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        ip_address: `${RandomGenerator.pick([1, 10, 172, 192])}.${RandomGenerator.pick([0, 168])}.${RandomGenerator.pick([0, 1])}.${RandomGenerator.pick([1, 254])}`,
      } satisfies IDiscussionBoardGuest.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Step 2: Retrieve session by guest ID using connection with token
  const sessionConnection: api.IConnection = { host: connection.host };
  // The join function automatically sets the authorization token in the connection headers
  const retrievedSession =
    await api.functional.discussionBoard.guest.sessions.at(sessionConnection, {
      sessionId: joinResponse.id,
    });
  typia.assert(retrievedSession);
  // Step 3: Verify session data matches original
  TestValidator.equals(
    "guest ID matches",
    retrievedSession.guest.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "device fingerprint matches",
    retrievedSession.guest.device_fingerprint,
    joinResponse.device_fingerprint,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedSession.guest.ip_address,
    joinResponse.ip_address,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    () => !isNaN(new Date(retrievedSession.guest.created_at).getTime()),
  );
}
