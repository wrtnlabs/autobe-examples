import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
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

export async function test_api_member_sessions_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member - creates an active session automatically
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Filter isActive=true (active sessions)
  const activeSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        isActive: true,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Verify all returned sessions are active
  TestValidator.predicate(
    "all sessions with isActive=true filter should be active",
    activeSessions.data.every((s) => s.isActive === true),
  );
  // Verify at least 1 active session exists (the one created during join)
  TestValidator.predicate(
    "active sessions count should be >= 1",
    activeSessions.pagination.records >= 1,
  );
  // 3. Filter isActive=false (expired sessions)
  const expiredSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {
        isActive: false,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // Verify all returned sessions are expired
  TestValidator.predicate(
    "all sessions with isActive=false filter should be expired",
    expiredSessions.data.every((s) => s.isActive === false),
  );
  // For a fresh account, expired sessions should be 0
  TestValidator.equals(
    "expired sessions count should be 0 for fresh account",
    expiredSessions.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired sessions data should be empty array",
    expiredSessions.data.length,
    0,
  );
  // 4. No filter (combined) - should return total = active + expired
  const allSessions = await api.functional.erpHrm.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  const expectedTotal =
    activeSessions.pagination.records + expiredSessions.pagination.records;
  TestValidator.equals(
    "total sessions without filter should equal sum of active and expired",
    allSessions.pagination.records,
    expectedTotal,
  );
}
