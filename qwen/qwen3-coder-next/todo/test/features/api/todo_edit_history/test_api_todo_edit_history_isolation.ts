import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

export async function test_api_todo_edit_history_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.todoApp.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberA);
  // 2. Member A creates a todo
  const todo = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit the todo as member A to create edit history
  const editResponse1 = await api.functional.todoApp.member.todos.index(
    memberAConnection,
    {
      body: {
        status: "all",
        sort: "createdAt",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(editResponse1);
  const updatedTodo = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: "Updated title by member A",
        description: "Updated description",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 172800000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Create member B and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.todoApp.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string>()),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(memberB);
  // 5. Member B attempts to access member A's todo edit history (should fail with 404)
  await TestValidator.error(
    "member B cannot access member A's todo edit history",
    async () => {
      await api.functional.todoApp.member.todos.edit_history.index(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
}
