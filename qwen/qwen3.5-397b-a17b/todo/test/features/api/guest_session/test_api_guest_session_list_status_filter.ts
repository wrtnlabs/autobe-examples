import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session list filtering by expiration status.
 *
 * Validates the session status filtering functionality by testing active and expired session retrieval. The test authenticates a guest user, then queries sessions with different status filters to ensure proper filtering based on expired_at timestamp comparison with current time.
 *
 * The test covers three filtering scenarios: active sessions only (expired_at in future), expired sessions only (expired_at in past or present), and unfiltered retrieval (all sessions). Each scenario validates that the returned sessions match the expected status criteria.
 *
 * 1. Guest authentication using device fingerprint registration.
 * 2. Query sessions with status='active' filter, validate all expired_at are in future.
 * 3. Query sessions with status='expired' filter, validate all expired_at are in past or present.
 * 4. Query sessions without status filter, validate both active and expired sessions are included.
 */
export async function test_api_guest_session_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Get current timestamp for comparison
  const now = new Date();
  // 3. Query active sessions (expired_at in future)
  const activeSessions = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        status: "active",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Validate all active sessions have expired_at in the future
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `active session ${session.id} should not be expired`,
      expiredAt > now,
    );
  }
  // 4. Query expired sessions (expired_at in past or present)
  const expiredSessions = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        status: "expired",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // Validate all expired sessions have expired_at in past or present
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `expired session ${session.id} should be expired`,
      expiredAt <= now,
    );
  }
  // 5. Query all sessions without status filter
  const allSessions = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // Validate total count matches sum of active and expired
  TestValidator.equals(
    "total sessions equals active plus expired",
    allSessions.data.length,
    activeSessions.data.length + expiredSessions.data.length,
  );
}
