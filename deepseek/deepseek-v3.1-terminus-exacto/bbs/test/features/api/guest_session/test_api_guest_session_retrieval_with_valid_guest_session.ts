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

export async function test_api_guest_session_retrieval_with_valid_guest_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest session using the join endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  // Prepare join request data
  const joinData = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardGuest.IJoin;
  const authorizedGuest = await authorize_guest_join(guestConnection, {
    body: joinData,
  });
  typia.assert(authorizedGuest);
  // The session ID should be available from the guest session creation
  // Since the join endpoint returns guest authorization, we need to use the guest ID
  // and assume it correlates to the session for retrieval purposes
  const sessionId = authorizedGuest.id;
  // Retrieve the guest session details
  const retrievedSession =
    await api.functional.discussionBoard.guest.sessions.at(guestConnection, {
      sessionId: sessionId satisfies string & tags.Format<"uuid">,
      body: {} satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(retrievedSession);
  // Validate the session structure matches expectations
  TestValidator.equals("session ID matches", retrievedSession.id, sessionId);
  // Validate that the session data matches the original join request data
  TestValidator.equals("IP address matches", retrievedSession.ip, joinData.ip);
  TestValidator.equals("href matches", retrievedSession.href, joinData.href);
  TestValidator.equals(
    "referrer matches",
    retrievedSession.referrer,
    joinData.referrer,
  );
  // Validate guest association
  TestValidator.equals(
    "guest ID matches",
    retrievedSession.guest.id,
    authorizedGuest.id,
  );
  TestValidator.equals(
    "device fingerprint matches",
    retrievedSession.guest.device_fingerprint,
    authorizedGuest.device_fingerprint,
  );
  // Validate timestamps are properly ordered
  const createdAt = new Date(retrievedSession.created_at);
  const expiredAt = new Date(retrievedSession.expired_at);
  TestValidator.predicate(
    "expiration is after creation",
    expiredAt > createdAt,
  );
}
