import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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
 * Test bulk completion toggle for multiple member-owned todos.
 *
 * Validates that a member can bulk-toggle completion for several of their
 * own todos and that the operation is a true toggle (incomplete ↔ complete)
 * without altering non-completion fields. The test runs the bulk toggle
 * twice with the same todoIds and verifies that updatedAt changes each time
 * and other summary attributes remain stable.
 *
 * 1. A new member joins to obtain authentication.
 * 2. The member creates two member-owned todos.
 * 3. Bulk-toggle completion for both todos and validate returned summary semantics.
 * 4. Bulk-toggle completion again with the same ids and validate toggle-back.
 */
export async function test_api_todo_completion_toggle_bulk_owned_happy_path(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  const createdTodos: IMultiUserTodoTodo[] = await ArrayUtil.asyncRepeat(
    2,
    async () =>
      await generate_random_multi_user_todo_member_todos_create(
        userConnection,
        {
          body: {
            title: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            startDate: RandomGenerator.date(new Date(), 1000).toISOString(),
            dueDate: RandomGenerator.date(new Date(), 2000).toISOString(),
          } satisfies IMultiUserTodoTodo.ICreate,
        },
      ),
  );
  for (const todo of createdTodos) typia.assert(todo);
  const todoIds = createdTodos.map((t) => t.id) as (string &
    tags.Format<"uuid">)[];
  const before = new Map<string & tags.Format<"uuid">, IMultiUserTodoTodo>();
  for (const todo of createdTodos) before.set(todo.id, todo);
  const request: IMultiUserTodoTodoEditHistoryEntry.IRequest = {
    todoIds,
    page: null,
    limit: null,
  };
  const toggled1 =
    await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
      userConnection,
      {
        body: request,
      },
    );
  typia.assert(toggled1);
  const firstId = todoIds[0];
  const beforeFirst = before.get(firstId);
  TestValidator.predicate(
    "first todo exists before toggle",
    () => beforeFirst !== undefined,
  );
  if (!beforeFirst) throw new Error("Missing first todo before toggle");
  TestValidator.equals(
    "returned summary id is one of requested ids",
    todoIds.includes(toggled1.id),
    true,
  );
  TestValidator.equals(
    "returned summary isComplete toggled",
    toggled1.isComplete,
    !beforeFirst.is_complete,
  );
  TestValidator.notEquals(
    "returned summary updatedAt changed",
    toggled1.updatedAt,
    beforeFirst.updated_at,
  );
  TestValidator.equals("title unchanged", toggled1.title, beforeFirst.title);
  TestValidator.equals(
    "description unchanged",
    toggled1.description,
    beforeFirst.description,
  );
  TestValidator.equals(
    "startDate unchanged",
    toggled1.startDate,
    beforeFirst.start_date,
  );
  TestValidator.equals(
    "dueDate unchanged",
    toggled1.dueDate,
    beforeFirst.due_date,
  );
  TestValidator.equals(
    "createdAt unchanged",
    toggled1.createdAt,
    beforeFirst.created_at,
  );
  TestValidator.equals(
    "lifecycleState unchanged",
    toggled1.lifecycleState,
    beforeFirst.lifecycle_state,
  );
  TestValidator.equals(
    "deletedAt unchanged",
    toggled1.deletedAt,
    beforeFirst.deleted_at,
  );
  const toggled2 =
    await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
      userConnection,
      {
        body: request,
      },
    );
  typia.assert(toggled2);
  TestValidator.equals(
    "returned summary id is one of requested ids (toggle-back)",
    todoIds.includes(toggled2.id),
    true,
  );
  TestValidator.equals(
    "returned summary isComplete toggled back",
    toggled2.isComplete,
    beforeFirst.is_complete,
  );
  TestValidator.notEquals(
    "returned summary updatedAt changed again",
    toggled2.updatedAt,
    toggled1.updatedAt,
  );
  TestValidator.equals(
    "title unchanged (toggle-back)",
    toggled2.title,
    beforeFirst.title,
  );
  TestValidator.equals(
    "description unchanged (toggle-back)",
    toggled2.description,
    beforeFirst.description,
  );
  TestValidator.equals(
    "startDate unchanged (toggle-back)",
    toggled2.startDate,
    beforeFirst.start_date,
  );
  TestValidator.equals(
    "dueDate unchanged (toggle-back)",
    toggled2.dueDate,
    beforeFirst.due_date,
  );
  TestValidator.equals(
    "createdAt unchanged (toggle-back)",
    toggled2.createdAt,
    beforeFirst.created_at,
  );
  TestValidator.equals(
    "lifecycleState unchanged (toggle-back)",
    toggled2.lifecycleState,
    beforeFirst.lifecycle_state,
  );
  TestValidator.equals(
    "deletedAt unchanged (toggle-back)",
    toggled2.deletedAt,
    beforeFirst.deleted_at,
  );
}
