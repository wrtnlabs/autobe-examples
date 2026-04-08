import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

/**
 * Test todo creation with only the required title field.
 *
 * Validates the primary success path for creating a todo item with minimal input. The authenticated member creates a new todo by providing only the title field, leaving all optional fields (description, start_date, due_date) unset. Verifies that the todo is created successfully with default values: is_completed set to false, is_deleted set to false, and all optional fields are null.
 *
 * Special attention is given to ensuring the created todo contains all required entity fields including generated UUID, timestamps, member relation, and empty editHistories array. The todo should be immediately accessible and properly associated with the authenticated member.
 *
 * 1. Member registers with email, password, and display name using authorize_member_join utility.
 * 2. Member creates a todo with only the title field (no description, start_date, or due_date).
 * 3. Validate the created todo has: is_completed=false, is_deleted=false, description=null, startDate=null, dueDate=null.
 * 4. Validate the response contains complete todo entity with UUID, timestamps, member relation, and empty editHistories array.
 */
export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create todo with only title
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Validate default values
  TestValidator.equals("title matches input", todo.title, todoTitle);
  TestValidator.predicate("is completed is false", todo.isCompleted === false);
  TestValidator.predicate("is deleted is false", todo.isDeleted === false);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("start date is null", todo.startDate, null);
  TestValidator.equals("due date is null", todo.dueDate, null);
  // 4. Validate entity structure and relations
  TestValidator.equals("member id matches", todo.member.id, authorized.id);
  TestValidator.equals(
    "member display name matches",
    todo.member.display_name,
    authorized.display_name,
  );
  TestValidator.predicate(
    "edit histories is empty array",
    Array.isArray(todo.editHistories) && todo.editHistories.length === 0,
  );
}
