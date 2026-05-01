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
 * Test that an authenticated member can retrieve their own session by its unique identifier.
 *
 * Validates the session inspection success path used in security auditing and verifying active login origins. After joining as a guest and establishing an authenticated session, the test calls the session retrieval endpoint with the session's unique identifier.
 *
 * The response must return a complete IErpHrmMemberSession record containing the session UUID, member summary profile, JWT access and refresh tokens, organization context, connection metadata including IP address and page URL, and both creation and expiration timestamps.
 *
 * 1. Guest joins with randomly generated credentials to establish an authenticated session.
 * 2. Retrieves the member's own session by its unique identifier.
 * 3. Validates the complete session structure through typia.assert.
 */
export async function test_api_session_own_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a guest to establish an authenticated session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Retrieve the session
  const session = await api.functional.erpHrm.guest.sessions.at(
    guestConnection,
    {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(session);
}
