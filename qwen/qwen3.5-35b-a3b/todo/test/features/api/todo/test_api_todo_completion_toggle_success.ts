import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_completion_toggle_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  // 2. Create incomplete todo
  const todo = await api.functional.multiUserTodoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Validate todo starts as incomplete
  TestValidator.equals("initial status incomplete", todo.isCompleted, false);
  // 3. Toggle completion status
  const updatedTodo =
    await api.functional.multiUserTodoApp.member.todos.complete(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(updatedTodo);
  // 4. Validate toggle was successful
  TestValidator.equals("status is now complete", updatedTodo.isCompleted, true);
  TestValidator.notEquals(
    "updatedAt updated",
    todo.updatedAt,
    updatedTodo.updatedAt,
  );
}