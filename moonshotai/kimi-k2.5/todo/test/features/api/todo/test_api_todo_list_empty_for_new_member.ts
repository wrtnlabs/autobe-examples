import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_list_empty_for_new_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection and register as a fresh member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // Query todos with empty request to retrieve all todos for the new member
  const response: IPageIMultiUserTodoTodo.ISummary =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {} satisfies IMultiUserTodoTodo.IRequest,
    });
  // Validate the response structure matches expected types
  typia.assert(response);
  // Verify pagination metadata shows empty result for new member
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", response.pagination.pages, 0);
  TestValidator.equals("data array length", response.data.length, 0);
}
