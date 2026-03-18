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
 * Test guest session retrieval when session not found.
 * Verifies that attempting to retrieve a non-existent session returns a 404 error.
 *
 * 1. Guest creates a connection
 * 2. Authenticate as guest
 * 3. Generate random UUID for a session that doesn't exist
 * 4. Attempt to retrieve the non-existent session
 * 5. Expect 404 Not Found error
 */
export async function test_api_guest_session_retrieval_not_found(
  connection: api.IConnection,
) {
  // Create isolated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Authenticate as guest to establish authorized session context
  await authorize_guest_join(guestConnection, {});
  // Generate a random UUID that doesn't correspond to any existing session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent session and expect an error
  await TestValidator.error("session not found", async () => {
    await api.functional.erpHrm.guest.sessions.at(guestConnection, {
      sessionId: nonExistentSessionId,
    });
  });
}
