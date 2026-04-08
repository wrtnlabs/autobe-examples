import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_creation_success_full_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create todo with all fields
  const todoConnection: api.IConnection = { host: connection.host };
  const inputTitle = RandomGenerator.name(5);
  const inputDescription = RandomGenerator.paragraph({ sentences: 5 });
  const inputStartDate = new Date(Date.now() + 86400000).toISOString();
  const inputDueDate = new Date(Date.now() + 172800000).toISOString();
  const todo = await api.functional.multiUserTodo.member.todos.create(
    todoConnection,
    {
      body: {
        title: inputTitle,
        description: inputDescription,
        start_date: inputStartDate,
        due_date: inputDueDate,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate response fields match input
  TestValidator.equals("title matches input", todo.title, inputTitle);
  TestValidator.equals(
    "description matches input",
    todo.description,
    inputDescription,
  );
  TestValidator.equals(
    "start_date matches input",
    todo.start_date,
    inputStartDate,
  );
  TestValidator.equals("due_date matches input", todo.due_date, inputDueDate);
  // 4. Validate default values
  TestValidator.equals("is_complete default to false", todo.is_complete, false);
  TestValidator.equals("is_deleted default to false", todo.is_deleted, false);
  TestValidator.equals(
    "deleted_at is null for active todo",
    todo.deleted_at,
    null,
  );
  // 5. Validate relationship to member
  TestValidator.equals(
    "multi_user_todo_member_id matches member id",
    todo.multi_user_todo_member_id,
    member.id,
  );
  // 6. Validate timestamps are set (already validated by typia.assert for format)
  TestValidator.predicate(
    "created_at is recent",
    new Date(todo.created_at).getTime() > Date.now() - 1000,
  );
  TestValidator.equals(
    "updated_at matches created_at",
    todo.updated_at,
    todo.created_at,
  );
}
