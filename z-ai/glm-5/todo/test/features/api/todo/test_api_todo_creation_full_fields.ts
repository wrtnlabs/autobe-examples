import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_todo_creation_full_fields(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test data with all fields
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const description = RandomGenerator.content({ paragraphs: 2 });
  const now = new Date();
  const startDate = RandomGenerator.date(now, 30 * 24 * 60 * 60 * 1000); // Within next 30 days
  const dueDate = RandomGenerator.date(
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    60 * 24 * 60 * 60 * 1000,
  ); // 30-90 days from now
  // 1. Authenticate as a new member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create a todo with all fields using SDK directly (not generate function)
  const todo = await api.functional.privateTodoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title,
        description,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
      } satisfies IPrivateTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Verify submitted values are correctly stored
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("description matches", todo.description, description);
  TestValidator.equals(
    "start_date matches",
    todo.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "due_date matches",
    todo.due_date,
    dueDate.toISOString(),
  );
  // 4. Verify auto-generated fields
  TestValidator.equals("completed defaults to false", todo.completed, false);
  TestValidator.equals("deleted_at is null", todo.deleted_at, null);
  // 5. Verify member field matches authenticated member
  TestValidator.equals("member.id matches", todo.member.id, authResult.id);
  TestValidator.equals(
    "member.displayName matches",
    todo.member.displayName,
    authResult.displayName,
  );
  // 6. Verify timestamps are within acceptable range (1 minute tolerance)
  const afterCreation = new Date();
  const createdAt = new Date(todo.created_at);
  const updatedAt = new Date(todo.updated_at);
  const tolerance = 60 * 1000; // 1 minute in milliseconds
  TestValidator.predicate(
    "created_at is within acceptable range",
    createdAt.getTime() >= now.getTime() - tolerance &&
      createdAt.getTime() <= afterCreation.getTime() + tolerance,
  );
  TestValidator.predicate(
    "updated_at is within acceptable range",
    updatedAt.getTime() >= now.getTime() - tolerance &&
      updatedAt.getTime() <= afterCreation.getTime() + tolerance,
  );
}
