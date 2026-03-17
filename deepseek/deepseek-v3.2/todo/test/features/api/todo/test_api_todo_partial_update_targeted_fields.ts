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
 * Test partial updates where only specific fields are modified while others remain unchanged.
 * 1. Create todo with all fields populated
 * 2. Update only completion status from false to true, preserving other fields
 * 3. Update only description to null, preserving other fields including completion status
 * 4. Test empty update body returns original todo unchanged
 */
export async function test_api_todo_partial_update_targeted_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create initial todo with all fields populated
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: typia.random<string>(),
        description: typia.random<string>(),
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // Test 1: Update only completion status from false to true
  const completionUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(completionUpdate);
  // Verify only completed field changed, others unchanged
  TestValidator.equals(
    "title unchanged after completion update",
    completionUpdate.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "description unchanged after completion update",
    completionUpdate.description,
    initialTodo.description,
  );
  TestValidator.equals(
    "start_date unchanged after completion update",
    completionUpdate.start_date,
    initialTodo.start_date,
  );
  TestValidator.equals(
    "due_date unchanged after completion update",
    completionUpdate.due_date,
    initialTodo.due_date,
  );
  TestValidator.predicate(
    "completion status changed from false to true",
    initialTodo.completed === false && completionUpdate.completed === true,
  );
  // Test 2: Update only description to null
  const descriptionUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        description: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(descriptionUpdate);
  // Verify only description changed to null, other fields unchanged (including completion status)
  TestValidator.equals(
    "title unchanged after description null update",
    descriptionUpdate.title,
    initialTodo.title,
  );
  TestValidator.equals(
    "description is null after update",
    descriptionUpdate.description,
    null,
  );
  TestValidator.equals(
    "start_date unchanged after description null update",
    descriptionUpdate.start_date,
    initialTodo.start_date,
  );
  TestValidator.equals(
    "due_date unchanged after description null update",
    descriptionUpdate.due_date,
    initialTodo.due_date,
  );
  TestValidator.equals(
    "completion status remains true after description null update",
    descriptionUpdate.completed,
    completionUpdate.completed,
  );
  // Test 3: Empty update (no changes)
  const emptyUpdate = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {} satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(emptyUpdate);
  // Verify todo remains unchanged after empty update
  TestValidator.equals(
    "todo unchanged after empty update",
    emptyUpdate,
    descriptionUpdate,
  );
}
