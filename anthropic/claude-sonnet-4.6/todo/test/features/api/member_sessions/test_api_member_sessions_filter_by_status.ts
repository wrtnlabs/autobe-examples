import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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
  // 1. Register a new member to get an authenticated connection with one active session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Scenario A - Filter by 'active' status
  const activeSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "active" as string & tags.Pattern<"^(active|expired)$">,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // All returned sessions must be active
  TestValidator.predicate(
    "all active-filtered sessions have isActive=true",
    activeSessions.data.every((s) => s.isActive === true),
  );
  // The newly created join session must appear in the active results
  TestValidator.predicate(
    "active sessions contain at least one session (the join session)",
    activeSessions.data.length >= 1,
  );
  // 3. Scenario B - Filter by 'expired' status
  const expiredSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "expired" as string & tags.Pattern<"^(active|expired)$">,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // All returned sessions must be expired (isActive = false)
  TestValidator.predicate(
    "all expired-filtered sessions have isActive=false",
    expiredSessions.data.every((s) => s.isActive === false),
  );
  // For a freshly registered member, there should be 0 expired sessions
  TestValidator.equals(
    "expired sessions records count is 0 for fresh member",
    expiredSessions.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired sessions data array is empty for fresh member",
    expiredSessions.data.length,
    0,
  );
  TestValidator.equals(
    "expired sessions pages count is 0 for fresh member",
    expiredSessions.pagination.pages,
    0,
  );
  // 4. Edge Case - No filter (all sessions)
  const allSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // Total unfiltered records should be >= active records count
  TestValidator.predicate(
    "unfiltered sessions records >= active sessions records",
    allSessions.pagination.records >= activeSessions.pagination.records,
  );
}
