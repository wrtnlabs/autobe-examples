import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodo";
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

export async function test_api_todo_completion_toggle_bulk_respects_lifecycle_trashed_vs_permanently_removed(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test bulk completion toggle lifecycle eligibility and anti-partial behavior.
   *
   * Validates that toggling completion for multiple todos is blocked when the
   * request includes any permanently removed/inaccessible todo id, ensuring
   * an all-or-nothing transactional outcome.
   *
   * Also validates that when the permanently removed todo id is excluded,
   * eligible trashed todos have their completion state flipped while their
   * deletion/lifecycle markers remain in trash state.
   *
   * 1. Authenticate as a member.
   * 2. Create three todos.
   * 3. Move two todos into trash.
   * 4. Permanently delete the remaining todo.
   * 5. Attempt bulk toggle with mixed eligibility and assert no completion
   *    changes.
   * 6. Retry bulk toggle with only eligible ids and assert completion flips.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo1-${member.display_name}`,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo2-${member.display_name}`,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: `Todo3-${member.display_name}`,
        description: null,
        startDate: null,
        dueDate: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo3);
  const trashResult =
    await api.functional.multiUserTodo.member.todos.bulk_move_to_trash.bulkMoveToTrash(
      memberConnection,
      {
        body: {
          ids: [todo1.id, todo2.id],
        } satisfies IMultiUserTodoTodo.IBulkMoveToTrashRequest,
      },
    );
  typia.assert(trashResult);
  const permDeleted =
    await api.functional.multiUserTodo.member.todos.bulk_permanent_delete.bulkPermanentDelete(
      memberConnection,
      {
        body: {
          todoIds: [todo3.id],
        } satisfies IMultiUserTodo.IBulkPermanentDeleteRequest,
      },
    );
  typia.assert(permDeleted);
  const beforeTodo1 = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: todo1.id },
  );
  typia.assert(beforeTodo1);
  const beforeTodo2 = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: todo2.id },
  );
  typia.assert(beforeTodo2);
  await TestValidator.error(
    "bulk toggle completion should reject permanently removed todo IDs",
    async () => {
      await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
        memberConnection,
        {
          body: {
            todoIds: [todo1.id, todo2.id, todo3.id],
          } satisfies IMultiUserTodoTodoEditHistoryEntry.IRequest,
        },
      );
    },
  );
  const afterRejectTodo1 = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: todo1.id },
  );
  typia.assert(afterRejectTodo1);
  const afterRejectTodo2 = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: todo2.id },
  );
  typia.assert(afterRejectTodo2);
  TestValidator.equals(
    "Todo1 is_complete unchanged after rejected bulk toggle",
    afterRejectTodo1.is_complete,
    beforeTodo1.is_complete,
  );
  TestValidator.equals(
    "Todo2 is_complete unchanged after rejected bulk toggle",
    afterRejectTodo2.is_complete,
    beforeTodo2.is_complete,
  );
  TestValidator.equals(
    "Todo1 deleted_at unchanged after rejected bulk toggle",
    afterRejectTodo1.deleted_at,
    beforeTodo1.deleted_at,
  );
  TestValidator.equals(
    "Todo2 deleted_at unchanged after rejected bulk toggle",
    afterRejectTodo2.deleted_at,
    beforeTodo2.deleted_at,
  );
  TestValidator.equals(
    "Todo1 lifecycle_state unchanged after rejected bulk toggle",
    afterRejectTodo1.lifecycle_state,
    beforeTodo1.lifecycle_state,
  );
  TestValidator.equals(
    "Todo2 lifecycle_state unchanged after rejected bulk toggle",
    afterRejectTodo2.lifecycle_state,
    beforeTodo2.lifecycle_state,
  );
  const toggleResult =
    await api.functional.multiUserTodo.member.todos.bulk_toggle_completion.bulkToggleCompletion(
      memberConnection,
      {
        body: {
          todoIds: [todo1.id, todo2.id],
        } satisfies IMultiUserTodoTodoEditHistoryEntry.IRequest,
      },
    );
  typia.assert(toggleResult);
  const afterToggleTodo1 = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: todo1.id },
  );
  typia.assert(afterToggleTodo1);
  const afterToggleTodo2 = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: todo2.id },
  );
  typia.assert(afterToggleTodo2);
  TestValidator.equals(
    "Todo1 is_complete flipped after eligible bulk toggle",
    afterToggleTodo1.is_complete,
    !beforeTodo1.is_complete,
  );
  TestValidator.equals(
    "Todo2 is_complete flipped after eligible bulk toggle",
    afterToggleTodo2.is_complete,
    !beforeTodo2.is_complete,
  );
  TestValidator.equals(
    "Todo1 deleted_at remains trashed after completion toggle",
    afterToggleTodo1.deleted_at,
    beforeTodo1.deleted_at,
  );
  TestValidator.equals(
    "Todo2 deleted_at remains trashed after completion toggle",
    afterToggleTodo2.deleted_at,
    beforeTodo2.deleted_at,
  );
  TestValidator.equals(
    "Todo1 lifecycle_state remains trashed after completion toggle",
    afterToggleTodo1.lifecycle_state,
    beforeTodo1.lifecycle_state,
  );
  TestValidator.equals(
    "Todo2 lifecycle_state remains trashed after completion toggle",
    afterToggleTodo2.lifecycle_state,
    beforeTodo2.lifecycle_state,
  );
  TestValidator.equals(
    "Todo1 title unchanged after completion toggle",
    afterToggleTodo1.title,
    beforeTodo1.title,
  );
  TestValidator.equals(
    "Todo2 title unchanged after completion toggle",
    afterToggleTodo2.title,
    beforeTodo2.title,
  );
  TestValidator.equals(
    "Todo1 description unchanged after completion toggle",
    afterToggleTodo1.description,
    beforeTodo1.description,
  );
  TestValidator.equals(
    "Todo2 description unchanged after completion toggle",
    afterToggleTodo2.description,
    beforeTodo2.description,
  );
  TestValidator.equals(
    "Todo1 start_date unchanged after completion toggle",
    afterToggleTodo1.start_date,
    beforeTodo1.start_date,
  );
  TestValidator.equals(
    "Todo2 start_date unchanged after completion toggle",
    afterToggleTodo2.start_date,
    beforeTodo2.start_date,
  );
  TestValidator.equals(
    "Todo1 due_date unchanged after completion toggle",
    afterToggleTodo1.due_date,
    beforeTodo1.due_date,
  );
  TestValidator.equals(
    "Todo2 due_date unchanged after completion toggle",
    afterToggleTodo2.due_date,
    beforeTodo2.due_date,
  );
  TestValidator.notEquals(
    "Todo1 updated_at should change after completion toggle",
    afterToggleTodo1.updated_at,
    beforeTodo1.updated_at,
  );
  TestValidator.notEquals(
    "Todo2 updated_at should change after completion toggle",
    afterToggleTodo2.updated_at,
    beforeTodo2.updated_at,
  );
}
