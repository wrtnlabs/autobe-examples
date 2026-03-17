import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrashItem";
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
 * Test audit retrieval for a todo that was restored from trash.
 * 1. Create member account
 * 2. Create todo
 * 3. Delete todo to trash
 * 4. Restore todo from trash
 * 5. Retrieve audit information and verify:
 *    - restored_at timestamp is populated
 *    - deleted_at timestamp shows original deletion time
 *    - permanently_deleted_at remains null
 *    - Complete lifecycle: creation, deletion, restoration
 */
export async function test_api_todo_trash_audit_restored_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Delete todo to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Wait a moment to ensure timestamps differ
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Restore todo from trash
  const restoredTodo = await api.functional.todoApp.member.todos.trash.restore(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(restoredTodo);
  // Wait a moment to ensure restoration timestamp differs
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 5. Retrieve audit information
  const audit = await api.functional.todoApp.member.todos.trash.audit(
    memberConnection,
    { todoId: todo.id },
  );
  typia.assert(audit);
  // Validate audit data
  TestValidator.equals("todo ID matches", audit.todo.id, todo.id);
  TestValidator.equals(
    "member ID matches",
    audit.member.id,
    authorizedMember.id,
  );
  // Verify timestamps
  TestValidator.predicate("deleted_at is populated", audit.deleted_at !== null);
  TestValidator.predicate(
    "restored_at is populated",
    audit.restored_at !== null,
  );
  TestValidator.equals(
    "permanently_deleted_at remains null",
    audit.permanently_deleted_at,
    null,
  );
  // Verify timestamp order: deleted_at < restored_at
  if (audit.deleted_at !== null && audit.restored_at !== null) {
    const deletedAt = new Date(audit.deleted_at);
    const restoredAt = new Date(audit.restored_at);
    TestValidator.predicate(
      "deleted_at is before restored_at",
      deletedAt < restoredAt,
    );
  }
  // Verify lifecycle completeness
  TestValidator.predicate(
    "audit shows complete lifecycle",
    audit.deleted_at !== null &&
      audit.restored_at !== null &&
      audit.permanently_deleted_at === null,
  );
}
