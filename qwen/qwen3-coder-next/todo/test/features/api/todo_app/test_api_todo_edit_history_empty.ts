import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_todo_edit_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberSession.IJoin;
  const memberSession = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  // Step 2: Create new todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Step 3: Retrieve edit history for newly created todo
  const history = await api.functional.todoApp.member.todos.edit_history.index(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(history);
  // Step 4: Validate empty history
  TestValidator.equals(
    "edit history should be empty for new todo",
    history.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    history.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination current should be 1",
    history.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 0",
    history.pagination.limit === 0,
  );
  TestValidator.predicate(
    "pagination pages should be 0",
    history.pagination.pages === 0,
  );
}
