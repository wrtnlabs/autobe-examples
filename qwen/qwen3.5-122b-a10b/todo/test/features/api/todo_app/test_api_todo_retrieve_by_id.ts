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

/**
 * Test member retrieves a todo by its unique identifier.
 *
 * Validates the successful retrieval of a todo task by an authenticated member owner. The test ensures that the complete todo entity is returned with all fields including id, title, description, start_date, due_date, is_completed, created_at, updated_at, and the author summary with member id, display_name, and created_at.
 *
 * The test follows the natural workflow: member registration, todo creation, and todo retrieval. It verifies that the member can only access their own todos and that the author information correctly references the owning member.
 *
 * 1. Register a new member account with random credentials.
 * 2. Create a member-specific connection with the authentication token.
 * 3. Create a todo task using the member connection.
 * 4. Retrieve the todo by its unique identifier.
 * 5. Validate the response structure matches ITodoAppTodo type.
 * 6. Verify the author object contains correct member information.
 * 7. Confirm all todo fields are present and properly typed.
 */
export async function test_api_todo_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get auth token
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Create a todo that the member owns
  const todo: ITodoAppTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Retrieve the todo by ID
  const retrieved: ITodoAppTodo = await api.functional.todoApp.member.todos.at(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate the retrieved todo
  TestValidator.equals("todo id matches", retrieved.id, todo.id);
  TestValidator.equals("todo title matches", retrieved.title, todo.title);
  TestValidator.predicate("todo has author", retrieved.author !== null);
  TestValidator.equals(
    "author id matches member",
    retrieved.author.id,
    auth.id,
  );
  TestValidator.equals(
    "author display name matches",
    retrieved.author.display_name,
    auth.display_name,
  );
  TestValidator.predicate(
    "author has created_at",
    retrieved.author.created_at !== null,
  );
}
