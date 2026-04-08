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
 * Test successful soft deletion of a todo item by its owner.
 *
 * Validates that a member can soft delete their own todo, which moves it to trash by setting the deleted_at timestamp. The soft-deleted todo is removed from normal todo lists but retains all its data for potential restoration or permanent deletion.
 *
 * This test verifies the soft deletion workflow: member authentication, todo creation, and successful soft deletion operation. The test confirms that the erase operation completes without error and the member can continue using the system after deletion.
 *
 * 1. Member authenticates by joining with email and password credentials.
 * 2. Member creates a new todo with title, description, start date, and due date.
 * 3. Verifies the created todo has deleted_at = null (active state).
 * 4. Member soft deletes the todo using its UUID.
 * 5. Validates the soft delete operation completes successfully (204 No Content).
 * 6. Member creates another todo to verify system continues functioning after deletion.
 */
export async function test_api_todo_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a todo with comprehensive data
  const todoBeforeDelete = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(todoBeforeDelete);
  // 3. Verify todo is active (not deleted)
  TestValidator.equals(
    "todo is active before delete",
    todoBeforeDelete.deleted_at,
    null,
  );
  TestValidator.predicate("todo has title", todoBeforeDelete.title.length > 0);
  TestValidator.predicate(
    "todo is incomplete by default",
    todoBeforeDelete.completed === false,
  );
  TestValidator.predicate(
    "todo has description",
    todoBeforeDelete.description !== null,
  );
  TestValidator.predicate(
    "todo has start_date",
    todoBeforeDelete.start_date !== null,
  );
  TestValidator.predicate(
    "todo has due_date",
    todoBeforeDelete.due_date !== null,
  );
  // 4. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todoBeforeDelete.id,
  });
  // 5. Validate soft delete succeeded by creating another todo
  // This confirms the member's session is still valid and system functions normally
  const todoAfterDelete = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todoAfterDelete);
  TestValidator.predicate(
    "member can create todos after soft delete",
    todoAfterDelete.id !== todoBeforeDelete.id,
  );
  TestValidator.equals("new todo is active", todoAfterDelete.deleted_at, null);
}
