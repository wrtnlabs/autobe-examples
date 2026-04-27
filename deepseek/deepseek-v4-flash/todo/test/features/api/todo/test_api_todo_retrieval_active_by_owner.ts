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

export async function test_api_todo_retrieval_active_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const displayName = RandomGenerator.name();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "password123!",
      display_name: displayName,
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  // 2. Create a todo with all fields populated
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.paragraph({ sentences: 4 });
  const now = new Date();
  const startDate = now.toISOString();
  const dueDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by ID
  const retrieved = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response fields
  TestValidator.equals("id matches created todo", retrieved.id, todo.id);
  TestValidator.equals("title matches input", retrieved.title, title);
  TestValidator.equals(
    "description matches input",
    retrieved.description,
    description,
  );
  TestValidator.equals("member id matches", retrieved.member.id, joined.id);
  TestValidator.equals("member email matches", retrieved.member.email, email);
  TestValidator.equals(
    "member displayName matches",
    retrieved.member.displayName,
    displayName,
  );
  TestValidator.predicate(
    "completed_at is null (incomplete)",
    retrieved.completed_at === null,
  );
  TestValidator.predicate(
    "deleted_at is null (active, not in trash)",
    retrieved.deleted_at === null,
  );
}
