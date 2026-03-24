import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_view_own_todo_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const todoTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 2 });
  const startDate = RandomGenerator.date(new Date(), 1000 * 60 * 60);
  const dueDate = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24);
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: todoTitle,
        description: todoDescription,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  const fetchedTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(fetchedTodo);
  TestValidator.equals("todo id matches", fetchedTodo.id, createdTodo.id);
  TestValidator.equals("todo title matches", fetchedTodo.title, todoTitle);
  TestValidator.equals(
    "completion_status defaults to false",
    fetchedTodo.completion_status,
    false,
  );
  TestValidator.equals(
    "description matches",
    fetchedTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "start_date matches",
    fetchedTodo.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due_date matches",
    fetchedTodo.due_date,
    dueDate.toISOString(),
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    fetchedTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "deleted_in_trash_at is null for active todo",
    fetchedTodo.deleted_in_trash_at,
    null,
  );
}
