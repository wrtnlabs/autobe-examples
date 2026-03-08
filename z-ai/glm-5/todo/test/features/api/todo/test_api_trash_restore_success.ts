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

export async function test_api_trash_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a todo with all optional fields to verify preservation after restore
  const createdTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        dueDate: new Date(Date.now() + 604800000).toISOString(), // One week from now
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // Store original values for comparison after restore
  const originalId = createdTodo.id;
  const originalTitle = createdTodo.title;
  const originalDescription = createdTodo.description;
  const originalStartDate = createdTodo.startDate;
  const originalDueDate = createdTodo.dueDate;
  const originalCompleted = createdTodo.completed;
  // Step 3: Delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // Step 4: Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.member.trash.restore(
    memberConnection,
    {
      todoId: originalId,
    },
  );
  typia.assert(restoredTodo);
  // Step 5: Verify deletedAt is null after restore
  TestValidator.equals(
    "deletedAt should be null after restore",
    restoredTodo.deletedAt,
    null,
  );
  // Step 6: Verify all original properties are preserved
  TestValidator.equals("id should be preserved", restoredTodo.id, originalId);
  TestValidator.equals(
    "title should be preserved",
    restoredTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "description should be preserved",
    restoredTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "startDate should be preserved",
    restoredTodo.startDate,
    originalStartDate,
  );
  TestValidator.equals(
    "dueDate should be preserved",
    restoredTodo.dueDate,
    originalDueDate,
  );
  TestValidator.equals(
    "completed should be preserved",
    restoredTodo.completed,
    originalCompleted,
  );
  TestValidator.predicate(
    "updatedAt should be updated",
    restoredTodo.updatedAt !== createdTodo.updatedAt,
  );
}
