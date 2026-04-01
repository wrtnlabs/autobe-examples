import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

/**
 * Test partial update of todo fields where only specific fields are modified.
 * Validates that partial updates work correctly and unchanged fields are preserved.
 */
export async function test_api_todo_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create todo with all fields
  const originalTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(originalTodo);
  // 3. Update only title field
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTodo1 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: originalTodo.id,
      body: {
        title: newTitle,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo1);
  // Verify title changed but other fields preserved
  TestValidator.equals("title updated", updatedTodo1.title, newTitle);
  TestValidator.notEquals(
    "title differs from original",
    updatedTodo1.title,
    originalTodo.title,
  );
  TestValidator.equals(
    "description preserved",
    updatedTodo1.description,
    originalTodo.description,
  );
  TestValidator.equals(
    "started_at preserved",
    updatedTodo1.started_at,
    originalTodo.started_at,
  );
  TestValidator.equals(
    "due_at preserved",
    updatedTodo1.due_at,
    originalTodo.due_at,
  );
  // 4. Update only startedAt and dueAt fields
  const newStartedAt = new Date(Date.now() + 86400000 * 1).toISOString(); // 1 day from now
  const newDueAt = new Date(Date.now() + 86400000 * 14).toISOString(); // 14 days from now
  const updatedTodo2 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: originalTodo.id,
      body: {
        startedAt: newStartedAt,
        dueAt: newDueAt,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo2);
  // Verify dates changed but title and description preserved
  TestValidator.equals(
    "title preserved after date update",
    updatedTodo2.title,
    updatedTodo1.title,
  );
  TestValidator.equals(
    "description preserved after date update",
    updatedTodo2.description,
    updatedTodo1.description,
  );
  TestValidator.equals(
    "started_at updated",
    updatedTodo2.started_at,
    newStartedAt,
  );
  TestValidator.equals("due_at updated", updatedTodo2.due_at, newDueAt);
  TestValidator.notEquals(
    "started_at differs from original",
    updatedTodo2.started_at,
    originalTodo.started_at,
  );
  TestValidator.notEquals(
    "due_at differs from original",
    updatedTodo2.due_at,
    originalTodo.due_at,
  );
  // 5. Clear optional fields by setting to null
  const updatedTodo3 = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: originalTodo.id,
      body: {
        description: null,
        startedAt: null,
        dueAt: null,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo3);
  // Verify fields cleared but title preserved
  TestValidator.equals(
    "title preserved after clearing",
    updatedTodo3.title,
    updatedTodo2.title,
  );
  TestValidator.predicate(
    "description cleared",
    updatedTodo3.description === null,
  );
  TestValidator.predicate(
    "started_at cleared",
    updatedTodo3.started_at === null,
  );
  TestValidator.predicate("due_at cleared", updatedTodo3.due_at === null);
}
