import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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
 * Test that only the todo owner can update their todo.
 *
 * This test validates ownership verification for todo updates:
 * 1. Register and authenticate as first member (owner)
 * 2. Create a todo item as the owner
 * 3. Register and authenticate as second member (non-owner)
 * 4. Attempt to update the owner's todo as the non-owner - should fail with 403 Forbidden
 * 5. Update the todo as the owner - should succeed
 * 6. Verify the update was applied correctly
 */
export async function test_api_todo_update_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as first member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a todo item as the owner
  const todo = await generate_random_multi_user_todo_member_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Register and authenticate as second member (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(nonOwnerAuth);
  // 4. Attempt to update the owner's todo as the non-owner - should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner cannot update owner's todo",
    403,
    async () =>
      await api.functional.multiUserTodo.member.todos.update(
        nonOwnerConnection,
        {
          todoId: todo.id,
          body: {
            title: "Attempted unauthorized update",
          } satisfies IMultiUserTodoTodo.IUpdate,
        },
      ),
  );
  // 5. Update the todo as the owner - should succeed
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    ownerConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        completed: true,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 6. Verify the update was applied correctly
  TestValidator.equals("title was updated", updatedTodo.title, newTitle);
  TestValidator.equals("todo is completed", updatedTodo.completed, true);
  TestValidator.equals(
    "todo owner unchanged",
    updatedTodo.member.id,
    ownerAuth.id,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedTodo.updated_at !== todo.updated_at,
  );
}
