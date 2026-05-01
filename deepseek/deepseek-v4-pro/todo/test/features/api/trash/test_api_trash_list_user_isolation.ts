import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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
 * Test user isolation for trash list across different member accounts.
 *
 * Validates that soft-deleted todos are completely scoped to their owner by
 * confirming that member B sees an empty trash list even when member A has
 * soft-deleted todos in their own trash. Additionally verifies that member
 * B's trash query does not affect member A's data and that cross-member
 * isolation is enforced at the trash level.
 *
 * 1. Member A registers and authenticates via authorize_member_join.
 * 2. Member A creates two todos and soft-deletes both via the erase endpoint.
 * 3. Member B registers and authenticates with a completely different email.
 * 4. Member B requests the trash list with default parameters.
 * 5. Verify member B sees zero records, zero pages, and empty data array.
 * 6. Re-query member A's trash to confirm the 2 soft-deleted todos remain,
 *    proving that member B's trash query had no effect on member A's data.
 */
export async function test_api_trash_list_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create two todos for member A
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo2);
  // 3. Soft-delete both todos
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo1.id,
  });
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo2.id,
  });
  // 4. Register and authenticate as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Member B requests the trash list
  const memberBTrash = await api.functional.todoApp.member.todos.trash.index(
    memberBConnection,
    { body: {} satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(memberBTrash);
  // 6. Verify member B's trash is empty
  TestValidator.equals(
    "member B trash data should be empty",
    memberBTrash.data,
    [],
  );
  TestValidator.equals(
    "member B trash records should be 0",
    memberBTrash.pagination.records,
    0,
  );
  TestValidator.equals(
    "member B trash pages should be 0",
    memberBTrash.pagination.pages,
    0,
  );
  // 7. Verify member A's trash still contains 2 soft-deleted todos
  const memberATrash = await api.functional.todoApp.member.todos.trash.index(
    memberAConnection,
    { body: {} satisfies ITodoAppTodo.IRequest },
  );
  typia.assert(memberATrash);
  TestValidator.equals(
    "member A trash records should be 2",
    memberATrash.pagination.records,
    2,
  );
}
