import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create 2 todos for Member A
  const todoA1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA1);
  const todoA2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todoA2);
  // 3. Register Member B (completely separate account)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Create 1 todo for Member B
  const todoB1 = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {},
  );
  typia.assert(todoB1);
  // 5. Query todos as Member A
  const memberAList = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberAList);
  // 6. Verify Member A sees exactly 2 todos
  TestValidator.equals(
    "Member A pagination.records should be 2",
    memberAList.pagination.records,
    2,
  );
  TestValidator.equals(
    "Member A data length should be 2",
    memberAList.data.length,
    2,
  );
  // 7. Verify the IDs all belong to Member A's todos
  const memberAIds = memberAList.data.map((t) => t.id);
  TestValidator.predicate(
    "Member A list contains todoA1",
    memberAIds.includes(todoA1.id),
  );
  TestValidator.predicate(
    "Member A list contains todoA2",
    memberAIds.includes(todoA2.id),
  );
  // 8. Verify Member B's todo does NOT appear in Member A's list
  TestValidator.predicate(
    "Member B todo does not appear in Member A list",
    !memberAIds.includes(todoB1.id),
  );
  // 9. Query todos as Member B
  const memberBList = await api.functional.todoApp.member.todos.index(
    memberBConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBList);
  // 10. Verify Member B sees exactly 1 todo
  TestValidator.equals(
    "Member B pagination.records should be 1",
    memberBList.pagination.records,
    1,
  );
  TestValidator.equals(
    "Member B data length should be 1",
    memberBList.data.length,
    1,
  );
  // 11. Verify the ID belongs to Member B's todo
  const memberBIds = memberBList.data.map((t) => t.id);
  TestValidator.predicate(
    "Member B list contains todoB1",
    memberBIds.includes(todoB1.id),
  );
  // 12. Verify Member A's todos do NOT appear in Member B's list
  TestValidator.predicate(
    "Member A todo1 does not appear in Member B list",
    !memberBIds.includes(todoA1.id),
  );
  TestValidator.predicate(
    "Member A todo2 does not appear in Member B list",
    !memberBIds.includes(todoA2.id),
  );
}
