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

export async function test_api_session_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and establish authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Retrieve the paginated session list to obtain the sessionId
  const sessionList = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // There should be at least one session (created during join)
  TestValidator.predicate(
    "session list has at least one record",
    sessionList.data.length > 0,
  );
  // Get the first session's ID (most recent session from join)
  const sessionSummary = sessionList.data[0]!;
  const sessionId = sessionSummary.id;
  // Step 3: Retrieve the full session detail
  const sessionDetail = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(sessionDetail);
  // Step 4: Validate business logic
  // id must match the requested sessionId
  TestValidator.equals(
    "session id matches requested",
    sessionDetail.id,
    sessionId,
  );
  // todo_app_member_id must match the authenticated member's account ID
  TestValidator.equals(
    "todo_app_member_id matches authenticated member",
    sessionDetail.todo_app_member_id,
    authorized.id,
  );
  // ip must be a non-empty string
  TestValidator.predicate("ip is non-empty", sessionDetail.ip.length > 0);
  // expired_at must be after created_at (session is time-bounded)
  const createdAt = new Date(sessionDetail.created_at).getTime();
  const expiredAt = new Date(sessionDetail.expired_at).getTime();
  TestValidator.predicate(
    "expired_at is after created_at",
    expiredAt > createdAt,
  );
  // Step 5: Stability test - retrieve the same session again and confirm values are identical
  const sessionDetailAgain = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    {
      sessionId,
    },
  );
  typia.assert(sessionDetailAgain);
  TestValidator.equals(
    "session detail is stable across retrievals",
    sessionDetail,
    sessionDetailAgain,
  );
}
