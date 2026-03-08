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

export async function test_api_trash_privacy_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that members cannot see other members' deleted todos in their trash.
   *
   * Steps:
   * 1. Member A creates a todo with title 'Member A Private Todo'
   * 2. Member A deletes the todo (moves to trash)
   * 3. Member B joins and requests their trash list
   *
   * Validations:
   * - Member B's trash list should be empty
   * - Member B should NOT see Member A's deleted todo
   * - This validates the privacy rule: 'The system shall NOT allow any member to view another member's trash'
   * - Each member's trash is completely isolated based on todo_app_member_id filtering
   * - The query must always filter by authenticated member's ID to ensure complete data isolation
   */
  // Step 1: Member A joins and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: "Member A Private Todo",
        description:
          "This todo belongs to Member A and should only be visible to Member A",
      },
    },
  );
  typia.assert(todo);
  // Step 3: Member A deletes the todo (moves to trash)
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // Step 4: Member B joins as a completely separate member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 5: Member B requests their trash list
  const memberBTrash = await api.functional.todoApp.member.trash.index(
    memberBConnection,
    {
      body: {
        deleted: "trashed",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(memberBTrash);
  // Step 6: Validate privacy isolation
  // Member B's trash should be empty since they never deleted any todos
  TestValidator.equals(
    "Member B trash list should be empty",
    memberBTrash.data.length,
    0,
  );
  TestValidator.equals(
    "Member B trash total records should be 0",
    memberBTrash.pagination.records,
    0,
  );
  // Ensure Member A's deleted todo is NOT in Member B's trash
  const memberATodoInTrash = memberBTrash.data.find(
    (item) => item.id === todo.id,
  );
  TestValidator.predicate(
    "Member A's deleted todo should NOT appear in Member B's trash",
    memberATodoInTrash === undefined,
  );
}
