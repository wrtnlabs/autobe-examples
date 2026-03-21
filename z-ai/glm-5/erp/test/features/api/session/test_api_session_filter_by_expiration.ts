import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering sessions by expiration status for security auditing purposes.
 * 1. Create authenticated member context using authorize_member_join
 * 2. Query sessions with expired: true to get only expired sessions
 * 3. Query sessions with expired: false to get only active sessions
 * 4. Validate that active sessions have expired_at >= current time
 * 5. Validate that expired sessions have expired_at < current time
 */
export async function test_api_session_filter_by_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Get current timestamp for comparison
  const now = new Date();
  // Query sessions with expired: true to get expired sessions
  const expiredSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        expired: true,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // Query sessions with expired: false to get active sessions
  const activeSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        expired: false,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Validate that NO active session is expired (all have future or current expiration)
  TestValidator.predicate(
    "no active session is expired",
    !ArrayUtil.has(
      activeSessions.data,
      (session) => new Date(session.expired_at) < now,
    ),
  );
  // Validate that ALL expired sessions are truly expired (have past expiration)
  TestValidator.predicate(
    "all expired sessions are truly expired",
    !ArrayUtil.has(
      expiredSessions.data,
      (session) => new Date(session.expired_at) >= now,
    ),
  );
}
