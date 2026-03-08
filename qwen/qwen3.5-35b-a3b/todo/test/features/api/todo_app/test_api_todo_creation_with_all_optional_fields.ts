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

export async function test_api_todo_creation_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "http://test.local/join",
      referrer: "http://test.local/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create todo with all optional fields
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Prepare project proposal",
        description: "Draft Q1 roadmap and budget estimates",
        start_date: "2026-03-10T00:00:00Z",
        due_date: "2026-03-20T00:00:00Z",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate response
  TestValidator.equals("title matches", todo.title, "Prepare project proposal");
  TestValidator.equals(
    "description matches",
    todo.description,
    "Draft Q1 roadmap and budget estimates",
  );
  TestValidator.equals(
    "start_date matches",
    todo.start_date,
    "2026-03-10T00:00:00Z",
  );
  TestValidator.equals(
    "due_date matches",
    todo.due_date,
    "2026-03-20T00:00:00Z",
  );
  TestValidator.equals("is_complete is false", todo.is_complete, false);
  TestValidator.equals("is_deleted is false", todo.is_deleted, false);
}
