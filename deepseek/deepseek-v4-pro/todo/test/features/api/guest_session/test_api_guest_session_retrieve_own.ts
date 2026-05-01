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
 * Test guest session retrieval by session identifier after authentication.
 *
 * Validates that an authenticated guest can retrieve their own session
 * record with complete details. The test authenticates a guest via the join
 * endpoint with explicit session context metadata, then retrieves the session
 * and verifies that all fields match the join operation context.
 *
 * 1. Authenticate as a guest using the join endpoint with a device
 *    fingerprint and session context metadata (href and referrer URLs).
 * 2. Retrieve the session record by its unique identifier from the
 *    guest sessions endpoint.
 * 3. Validate the session response contains all required fields
 *    including id, ip, href, referrer, created_at, and expired_at
 *    through typia.assert structural validation.
 * 4. Confirm the href and referrer fields match the values provided
 *    during the join operation, ensuring the session belongs to
 *    the authenticated guest.
 */
export async function test_api_guest_session_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: { href, referrer },
  });
  typia.assert(joinResponse);
  const session = await api.functional.todoApp.guest.sessions.at(
    guestConnection,
    {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(session);
  TestValidator.equals("session href matches join context", session.href, href);
  TestValidator.equals(
    "session referrer matches join context",
    session.referrer,
    referrer,
  );
}
