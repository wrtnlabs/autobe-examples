import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestSession";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // 2. Make several API calls to generate multiple sessions
  const sessionsCreated: number = 3;
  for (let i = 0; i < sessionsCreated; i++) {
    await api.functional.todoApp.member.sessions.index(memberConnection);
  }
  // 3. Get member session list
  const sessionList =
    await api.functional.todoApp.member.sessions.index(memberConnection);
  typia.assert(sessionList);
  // 4. Validate response structure
  TestValidator.predicate("has pagination", sessionList.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(sessionList.data));
  // 5. Validate pagination structure
  const { pagination } = sessionList;
  TestValidator.predicate("current page >= 1", pagination.current >= 1);
  TestValidator.predicate("limit > 0", pagination.limit > 0);
  TestValidator.predicate("records >= 0", pagination.records >= 0);
  TestValidator.predicate("pages >= 0", pagination.pages >= 0);
  // 6. Verify session count matches expected
  TestValidator.equals(
    "session count matches created sessions",
    sessionList.data.length,
    sessionsCreated,
  );
  // 7. Validate each session entry structure
  for (const session of sessionList.data) {
    const fullSession = typia.assert<ITodoAppMemberSession.ISummary>(session);
    TestValidator.predicate("session has id", fullSession.id !== undefined);
    TestValidator.predicate(
      "session has todo_app_member_id",
      fullSession.todo_app_member_id !== undefined,
    );
    TestValidator.predicate(
      "session has created_at",
      fullSession.created_at !== undefined,
    );
    // Validate session belongs to authenticated member
    TestValidator.equals(
      "session belongs to authenticated member",
      fullSession.todo_app_member_id,
      member.user.id,
    );
  }
  // 8. Verify sorting (most recent first by default)
  if (sessionList.data.length >= 2) {
    const firstSession = typia.assert<ITodoAppMemberSession.ISummary>(
      sessionList.data[0],
    );
    const secondSession = typia.assert<ITodoAppMemberSession.ISummary>(
      sessionList.data[1],
    );
    const firstDate = new Date(firstSession.created_at).getTime();
    const secondDate = new Date(secondSession.created_at).getTime();
    TestValidator.predicate(
      "sessions sorted by creation time",
      firstDate >= secondDate,
    );
  }
}
