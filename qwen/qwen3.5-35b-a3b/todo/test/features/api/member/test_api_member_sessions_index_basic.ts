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

export async function test_api_member_sessions_index_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(joinConnection, {
    body: typia.random<ITodoAppMember.IJoin>(),
  });
  typia.assert(memberAuthorized);
  // 2. Create actor-specific connection with member token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuthorized.token.access };
  // 3. Request member sessions with default pagination
  const sessionsBody = {
    take: 20,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies ITodoAppMemberSession.IRequest;
  const output = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: sessionsBody,
    },
  );
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit is 20", output.pagination.limit, 20);
  TestValidator.equals("records is 0", output.pagination.records, 0);
  TestValidator.equals("pages is 0", output.pagination.pages, 0);
  // 5. Validate data array is empty
  TestValidator.equals("data array is empty", output.data.length, 0);
}
