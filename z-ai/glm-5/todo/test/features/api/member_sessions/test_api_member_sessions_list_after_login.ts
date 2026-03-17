import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppMemberSession";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list_after_login(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and create authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IPrivateTodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  typia.assert(member);
  // 2. Retrieve session list with default pagination
  const sessions: IPageIPrivateTodoAppMemberSession.ISummary =
    await api.functional.privateTodoApp.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies IPrivateTodoAppMemberSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 3. Validate session list is not empty (at least current session exists)
  TestValidator.predicate("session list not empty", sessions.data.length > 0);
  // 4. Validate first session has required fields
  const firstSession = sessions.data[0];
  typia.assert(firstSession);
  // 5. Validate privacy enforcement - session's member.id matches authenticated member
  TestValidator.equals(
    "session member id matches authenticated member",
    firstSession.member.id,
    member.id,
  );
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", sessions.pagination.current, 1);
  TestValidator.predicate(
    "total records >= 1",
    sessions.pagination.records >= 1,
  );
  TestValidator.predicate("total pages >= 1", sessions.pagination.pages >= 1);
}
