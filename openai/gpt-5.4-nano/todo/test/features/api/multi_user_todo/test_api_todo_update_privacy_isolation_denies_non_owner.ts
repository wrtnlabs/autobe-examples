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
 * Test that a member cannot update another member’s todo (privacy isolation).
 *
 * Validates authorization/ownership isolation for PUT /multiUserTodo/member/todos/{todoId} by attempting
 * an update from a different authenticated member context. The test ensures that:
 * 1) Member A can create a todo and we capture its todoId.
 * 2) Member B, using a separate authentication context, is denied when trying to update Member A’s todo.
 * 3) Member A’s subsequent update successfully applies and matches Member A’s intended values, implying
 *    that Member B’s denied update had no effective impact.
 *
 * 1. Member A joins.
 * 2. Member A creates a todo (target).
 * 3. Member B joins.
 * 4. Member B attempts PUT to update Member A’s todo and must be denied.
 * 5. Member A updates the todo and validates stored fields match Member A’s payload.
 */
export async function test_api_todo_update_privacy_isolation_denies_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins.
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
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
  typia.assert(memberA);
  // 2) Member A creates a todo to obtain target todoId.
  const targetTodo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24,
        ).toISOString(),
        dueDate: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 48,
        ).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(targetTodo);
  const todoId = targetTodo.id;
  // 3) Member B joins (separate auth context).
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
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
  typia.assert(memberB);
  // 4) Member B attempts to update Member A’s todo.
  const bUpdate = {
    title: `${RandomGenerator.name()}-from-B`,
    description: `B-${RandomGenerator.paragraph({ sentences: 2 })}`,
    startDate: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 72,
    ).toISOString(),
    dueDate: RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 96,
    ).toISOString(),
    isComplete: true,
  } satisfies IMultiUserTodoTodo.IUpdate;
  await TestValidator.error("non-owner update must be denied", async () => {
    await api.functional.multiUserTodo.member.todos.updateTodo(
      memberBConnection,
      {
        todoId,
        body: bUpdate,
      },
    );
  });
  // 5) Member A updates the todo to a known value and validates that the stored fields
  // match Member A’s payload.
  const aUpdate = {
    title: `${targetTodo.title}-updated-by-A`,
    description: null,
    startDate: null,
    dueDate: null,
    isComplete: false,
  } satisfies IMultiUserTodoTodo.IUpdate;
  const updatedByA = await api.functional.multiUserTodo.member.todos.updateTodo(
    memberAConnection,
    {
      todoId,
      body: aUpdate,
    },
  );
  typia.assert(updatedByA);
  TestValidator.equals("title changed by A", updatedByA.title, aUpdate.title);
  TestValidator.equals(
    "description cleared by A",
    updatedByA.description,
    aUpdate.description ?? null,
  );
  TestValidator.equals(
    "start_date cleared by A",
    updatedByA.start_date,
    aUpdate.startDate ?? null,
  );
  TestValidator.equals(
    "due_date cleared by A",
    updatedByA.due_date,
    aUpdate.dueDate ?? null,
  );
  TestValidator.equals("is_complete reflects A", updatedByA.is_complete, false);
}
