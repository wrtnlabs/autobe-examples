import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEdit";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
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

export async function test_api_todo_edit_history_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (todo owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.todoApp.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Create member B (attempting unauthorized access)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.todoApp.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberB);
  // 3. Member A creates a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 4. Member B attempts to access edit history for member A's todo (should fail)
  await TestValidator.error(
    "member B cannot access member A's todo edit history",
    async () => {
      await api.functional.todoApp.member.todos.histories.index(
        memberBConnection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies ITodoAppTodoEdit.IRequest,
        },
      );
    },
  );
}
