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

export async function test_api_todo_retrieval_minimal_creation_default_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection using authorize_member_join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // Create todo with minimal required fields (only title)
  const createTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 7,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: createTitle,
        // Intentionally omit description, start_date, due_date to test default null values
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Retrieve the created todo
  const retrieved = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // Validation 1: title matches creation value
  TestValidator.equals("todo title matches", retrieved.title, createTitle);
  // Validation 2: optional fields are null
  TestValidator.equals("description is null", retrieved.description, null);
  TestValidator.equals("start_date is null", retrieved.start_date, null);
  TestValidator.equals("due_date is null", retrieved.due_date, null);
  // Validation 3: completed is false by default
  TestValidator.equals(
    "completed is false by default",
    retrieved.completed,
    false,
  );
  // Validation 4: timestamps are properly set and in ISO 8601 format
  TestValidator.predicate("created_at is valid ISO datetime", () => {
    const date = new Date(retrieved.created_at);
    return !isNaN(date.getTime()) && retrieved.created_at.includes("T");
  });
  TestValidator.predicate("updated_at is valid ISO datetime", () => {
    const date = new Date(retrieved.updated_at);
    return !isNaN(date.getTime()) && retrieved.updated_at.includes("T");
  });
  // Additional validation: member field should match
  TestValidator.equals("member id matches", retrieved.member.id, member.id);
}
