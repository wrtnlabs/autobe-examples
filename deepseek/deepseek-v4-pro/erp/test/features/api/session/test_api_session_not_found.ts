import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Verify that the session retrieval endpoint returns a 404 Not Found error when
 * the requested session does not exist.
 *
 * After authenticating as a guest member via the join endpoint, the test calls
 * the session retrieval endpoint with a randomly generated UUID that does not
 * correspond to any existing session. The endpoint must return a 404 error,
 * confirming that non-existent sessions are properly rejected rather than
 * returning empty data or a different error code.
 *
 * 1. Authenticate as a guest member using the join endpoint.
 * 2. Generate a random UUID that does not correspond to any existing session.
 * 3. Attempt to retrieve the non-existent session.
 * 4. Verify the endpoint returns a 404 Not Found error.
 */
export async function test_api_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Attempt to retrieve a non-existent session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("session not found", 404, async () => {
    await api.functional.erpHrm.guest.sessions.at(guestConnection, {
      sessionId: nonExistentSessionId,
    });
  });
}
