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

export async function test_api_member_sessions_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (creates session #1)
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Log in to create session #2
  await authorize_member_login(memberConnection, {
    body: { email, password } satisfies ITodoAppMember.ILogin,
  });
  // 3. Log in again to create session #3
  await authorize_member_login(memberConnection, {
    body: { email, password } satisfies ITodoAppMember.ILogin,
  });
  // --- Pagination Test: Page 1, Limit 2 ---
  const page1 = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 data count", page1.data.length, 2);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page1 records", page1.pagination.records, 3);
  TestValidator.equals("page1 pages", page1.pagination.pages, 2);
  // --- Pagination Test: Page 2, Limit 2 ---
  const page2 = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 data count", page2.data.length, 1);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  // --- Sort Direction Test: DESC (newest first) ---
  const descResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sortDirection: "DESC",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(descResult);
  // --- Sort Direction Test: ASC (oldest first) ---
  const ascResult = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        sortDirection: "ASC",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ascResult);
  // Verify ordering: DESC first item should be newer or equal to ASC first item
  TestValidator.predicate(
    "DESC first item is newest",
    descResult.data.length > 0 && ascResult.data.length > 0,
  );
  const descFirst = descResult.data[0];
  const ascFirst = ascResult.data[0];
  TestValidator.predicate(
    "DESC createdAt >= ASC createdAt",
    new Date(descFirst!.createdAt).getTime() >=
      new Date(ascFirst!.createdAt).getTime(),
  );
  // Also verify that ordering is reversed: DESC first != ASC first (when there are multiple sessions)
  TestValidator.notEquals(
    "DESC and ASC first items differ",
    descFirst!.id,
    ascFirst!.id,
  );
}
