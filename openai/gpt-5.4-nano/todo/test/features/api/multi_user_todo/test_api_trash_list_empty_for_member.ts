import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_trash_list_empty_for_member(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = member.token.access;
  const response = await api.functional.multiUserTodo.member.trash.index(
    authConnection,
    {
      body: {
        page: 1,
        limit: 5,
        completionStatus: "all",
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IMultiUserTodoGuest.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("trash is empty", response.data.length, 0);
  TestValidator.equals(
    "pagination.records is 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is 0", response.pagination.pages, 0);
  TestValidator.predicate(
    "pagination.current is present",
    response.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination.limit is present",
    response.pagination.limit !== undefined,
  );
}
