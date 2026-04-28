import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_filter_by_active_status(
  connection: api.IConnection,
) {
  // 1. Register member to establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Apply active sessions filter - should return sessions with future expiredAt
  const activeRequestBody = {
    activeStatus: "active",
  } satisfies ITodoAppMemberSession.IRequest;
  const activeResponse = await api.functional.todoApp.sessions.index(
    memberConnection,
    {
      body: activeRequestBody,
    },
  );
  typia.assert(activeResponse);
  // Validate all active sessions have isActive === true
  for (const session of activeResponse.data) {
    TestValidator.predicate(`${session.id} is active`, session.isActive);
  }
  // 3. Apply expired sessions filter - should return sessions with past expiredAt
  const expiredRequestBody = {
    activeStatus: "expired",
  } satisfies ITodoAppMemberSession.IRequest;
  const expiredResponse = await api.functional.todoApp.sessions.index(
    memberConnection,
    {
      body: expiredRequestBody,
    },
  );
  typia.assert(expiredResponse);
  // Validate all expired sessions have isActive === false
  for (const session of expiredResponse.data) {
    TestValidator.predicate(`${session.id} is expired`, !session.isActive);
  }
  // 4. Verify pagination metadata is present
  TestValidator.predicate(
    "active response has pagination",
    activeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "expired response has pagination",
    expiredResponse.pagination !== undefined,
  );
}
