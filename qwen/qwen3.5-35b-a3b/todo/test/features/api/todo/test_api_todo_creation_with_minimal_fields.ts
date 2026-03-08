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

export async function test_api_todo_creation_with_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member to get authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 2. Create a todo with only the required title field
  // Note: memberConnection already has Authorization header from authorize_member_join
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: "Buy groceries",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate todo defaults and structure
  TestValidator.equals("is_complete is false", todo.is_complete, false);
  TestValidator.equals("is_deleted is false", todo.is_deleted, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start_date is null", todo.start_date, null);
  TestValidator.equals("due_date is null", todo.due_date, null);
  // Validate author association
  TestValidator.equals(
    "author ID matches member ID",
    todo.author.id,
    member.id,
  );
  TestValidator.equals(
    "author email matches member email",
    todo.author.email,
    member.email,
  );
  TestValidator.equals(
    "author display_name matches member display_name",
    todo.author.displayName,
    member.display_name,
  );
  TestValidator.equals(
    "author createdAt matches member createdAt",
    todo.author.createdAt,
    member.created_at,
  );
  TestValidator.equals(
    "author deletedAt matches member deletedAt",
    todo.author.deletedAt,
    member.deleted_at,
  );
}
