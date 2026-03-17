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

export async function test_api_member_sessions_list_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member — creates connection with auth token set internally
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 2. Retrieve sessions for first member with default pagination (empty body)
  const sessions1 = await api.functional.todoApp.member.sessions.index(
    member1Connection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessions1);
  // 3. Validate pagination defaults
  TestValidator.predicate(
    "pagination.current defaults to 1",
    sessions1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit defaults to 20",
    sessions1.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination.records >= 1 (session created during join)",
    sessions1.pagination.records >= 1,
  );
  TestValidator.predicate(
    "data array has at least one item",
    sessions1.data.length >= 1,
  );
  // 4. Validate the session created during join is active
  TestValidator.predicate(
    "at least one session is active (just issued token)",
    sessions1.data.some((s) => s.isActive === true),
  );
  // 5. Register second member — separate connection for data isolation check
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 6. Retrieve sessions for second member
  const sessions2 = await api.functional.todoApp.member.sessions.index(
    member2Connection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessions2);
  // 7. Verify second member has at least one session (their own join session)
  TestValidator.predicate(
    "second member has at least one session",
    sessions2.data.length >= 1,
  );
  // 8. Data isolation: second member's sessions must not include first member's session IDs
  const member1SessionIds = new Set(sessions1.data.map((s) => s.id));
  TestValidator.predicate(
    "second member sessions do not include first member sessions",
    sessions2.data.every((s) => !member1SessionIds.has(s.id)),
  );
}
