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

export async function test_api_todo_trash_audit_deleted_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create a todo using the authenticated member connection and utility function
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // Soft-delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // Retrieve audit trail for the deleted todo
  const audit = await api.functional.todoApp.member.todos.trash.audit(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(audit);
  // Validate audit fields
  TestValidator.predicate(
    "deleted_at should be populated",
    audit.deleted_at !== null,
  );
  TestValidator.equals("restored_at should be null", audit.restored_at, null);
  TestValidator.equals(
    "permanently_deleted_at should be null",
    audit.permanently_deleted_at,
    null,
  );
  // Validate todo information matches
  TestValidator.equals("todo id matches", audit.todo.id, todo.id);
  TestValidator.equals("todo title matches", audit.todo.title, todo.title);
  TestValidator.equals(
    "todo completed matches",
    audit.todo.completed,
    todo.completed,
  );
  // Validate member information matches
  TestValidator.equals("member id matches", audit.member.id, member.id);
  TestValidator.equals(
    "member email matches",
    audit.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display_name matches",
    audit.member.display_name,
    member.display_name,
  );
}
