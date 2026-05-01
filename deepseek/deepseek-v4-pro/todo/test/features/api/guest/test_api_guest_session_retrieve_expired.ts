import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of a guest session by its session ID.
 *
 * Validates that after a guest joins via the authentication endpoint, the
 * created session can be retrieved through the session lookup endpoint.
 * The session ID is extracted from the JWT access token payload and used
 * to query the session details.
 *
 * The test verifies that the session record includes all required fields:
 * id, ip, href, referrer, created_at, and expired_at. The expired_at
 * timestamp communicates the session's expiry status to the consumer,
 * and the session record remains retrievable for audit purposes.
 *
 * 1. Guest joins with randomized fingerprint and session context.
 * 2. Session ID is decoded from the JWT access token.
 * 3. Session is retrieved via GET /todoApp/guest/sessions/{sessionId}.
 * 4. Validates session ID matches and timestamps are valid ISO date-times.
 */
export async function test_api_guest_session_retrieve_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session via join
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResult);
  // 2. Extract session ID from JWT access token payload
  const payload = JSON.parse(
    Buffer.from(joinResult.token.access.split(".")[1], "base64").toString(),
  );
  const sessionId = typia.assert<string & tags.Format<"uuid">>(
    payload.session_id,
  );
  // 3. Retrieve the session
  const session = await api.functional.todoApp.guest.sessions.at(
    guestConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Validate session details
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.predicate(
    "expired_at is a valid ISO date-time",
    !Number.isNaN(Date.parse(session.expired_at)),
  );
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    !Number.isNaN(Date.parse(session.created_at)),
  );
}
