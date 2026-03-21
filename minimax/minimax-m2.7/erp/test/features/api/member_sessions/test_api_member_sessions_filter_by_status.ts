import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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

export async function test_api_member_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Get current time for comparison
  const now = new Date();
  // 2. Query sessions with status 'active'
  const activeSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "active",
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // 3. Verify pagination metadata exists
  TestValidator.equals(
    "active sessions pagination exists",
    activeSessions.pagination !== null &&
      activeSessions.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "active sessions pagination has current page",
    activeSessions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "active sessions pagination has limit",
    activeSessions.pagination.limit > 0,
  );
  // 4. Validate all returned active sessions have token_expired_at > now
  for (const session of activeSessions.data) {
    const tokenExpiredAt = new Date(session.token_expired_at);
    TestValidator.predicate(
      "active session token_expired_at > now",
      tokenExpiredAt > now,
    );
  }
  // 5. Query sessions with status 'expired'
  const expiredSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "expired",
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // 6. Verify pagination metadata exists for expired
  TestValidator.equals(
    "expired sessions pagination exists",
    expiredSessions.pagination !== null &&
      expiredSessions.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "expired sessions pagination has current page",
    expiredSessions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "expired sessions pagination has limit",
    expiredSessions.pagination.limit > 0,
  );
  // 7. Validate all returned expired sessions have token_expired_at <= now
  for (const session of expiredSessions.data) {
    const tokenExpiredAt = new Date(session.token_expired_at);
    TestValidator.predicate(
      "expired session token_expired_at <= now",
      tokenExpiredAt <= now,
    );
  }
  // 8. Verify no overlap between active and expired sessions
  const activeSessionIds = activeSessions.data.map((s) => s.id);
  const expiredSessionIds = expiredSessions.data.map((s) => s.id);
  for (const id of activeSessionIds) {
    TestValidator.equals(
      "active session ID not in expired sessions",
      expiredSessionIds.includes(id),
      false,
    );
  }
}
