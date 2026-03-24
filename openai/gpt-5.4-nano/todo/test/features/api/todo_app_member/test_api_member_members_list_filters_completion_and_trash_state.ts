import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
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

export async function test_api_member_members_list_filters_completion_and_trash_state(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A auth
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  // 2) Member B auth (for scoping)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // 3) Create todos for member A (ICreate does not allow completion_status; default is incomplete)
  const todoA1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todoA1);
  const todoA2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todoA2);
  const todoA3 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todoA3);
  // 4) Move todoA3 to trash, then restore it back to normal
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA3.id,
  });
  const restoredA3 =
    await api.functional.todoApp.member.todos.restore.restoreTodo(
      memberAConnection,
      {
        todoId: todoA3.id,
      },
    );
  typia.assert(restoredA3);
  // 5) Put the same todo back into trash so we can test deleted_in_trash=true
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todoA3.id,
  });
  // 6) Create one todo for member B (must never appear in member A list)
  const todoB1 = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      },
    },
  );
  typia.assert(todoB1);
  const memberAIds = new Set([todoA1.id, todoA2.id, todoA3.id]);
  // Helper to call list endpoint
  const list = async (body: ITodoAppMember.IRequest) => {
    const output = await api.functional.todoApp.member.members.index(
      memberAConnection,
      { body },
    );
    typia.assert(output);
    return output;
  };
  // 7) Filter: active (deleted_in_trash=false)
  const listActive = await list({
    deleted_in_trash: false,
    limit: 2,
    page: 1,
  });
  TestValidator.predicate(
    "active list pagination limit respected",
    () => listActive.data.length <= 2,
  );
  TestValidator.equals(
    "active list records equals memberA active todos count",
    listActive.pagination.records,
    2,
  );
  const activeIds = listActive.data.map((x) => x.id);
  TestValidator.predicate("active list contains only memberA todos", () =>
    activeIds.every((id) => memberAIds.has(id)),
  );
  TestValidator.predicate(
    "active list excludes todoA3 which is in trash",
    () => !activeIds.includes(todoA3.id),
  );
  // 8) Filter: trash (deleted_in_trash=true)
  const listTrash = await list({
    deleted_in_trash: true,
    limit: 5,
    page: 1,
  });
  typia.assert(listTrash);
  TestValidator.equals(
    "trash list records equals memberA trash todos count",
    listTrash.pagination.records,
    1,
  );
  const trashIds = listTrash.data.map((x) => x.id);
  TestValidator.predicate("trash list contains only memberA todos", () =>
    trashIds.every((id) => memberAIds.has(id)),
  );
  TestValidator.equals(
    "trash list contains the deleted todo",
    trashIds[0],
    todoA3.id,
  );
  // 9) Filter completion_status=false (incomplete) on active list
  const listIncomplete = await list({
    completion_status: false,
    deleted_in_trash: false,
    limit: 10,
    page: 1,
  });
  TestValidator.equals(
    "incomplete active records",
    listIncomplete.pagination.records,
    2,
  );
  const incompleteIds = listIncomplete.data.map((x) => x.id);
  TestValidator.predicate(
    "incomplete list includes todoA1 and todoA2",
    () =>
      incompleteIds.includes(todoA1.id) && incompleteIds.includes(todoA2.id),
  );
  // 10) Filter completion_status=true is not asserted because there is no provided API to mark todos complete.
  // 11) Omitted completion_status returns all active regardless of completion
  const listActiveAll = await list({
    deleted_in_trash: false,
    limit: 10,
    page: 1,
  });
  TestValidator.equals(
    "active list without completion filter returns all active",
    listActiveAll.pagination.records,
    2,
  );
  TestValidator.predicate("active all contains todoA1 and todoA2", () => {
    const ids = listActiveAll.data.map((x) => x.id);
    return ids.includes(todoA1.id) && ids.includes(todoA2.id);
  });
  // 12) Scoping: ensure member B todoB1 does not appear
  TestValidator.predicate("scoping excludes member B todo ids", () =>
    [...activeIds, ...trashIds, ...incompleteIds].every(
      (id) => id !== todoB1.id,
    ),
  );
  // 13) Ordering stability: repeated call with same filters returns same sequence
  const listActiveAgain = await list({
    deleted_in_trash: false,
    limit: 2,
    page: 1,
  });
  TestValidator.equals(
    "ordering stability active ids first call vs second call",
    JSON.stringify(activeIds),
    JSON.stringify(listActiveAgain.data.map((x) => x.id)),
  );
}
