import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { generate_random_todo_app_member_todos_history_create_todo_history_entry } from "../../../generate/generate_random_todo_app_member_todos_history_create_todo_history_entry";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { prepare_random_todo_app_todo_history_entry } from "../../../prepare/prepare_random_todo_app_todo_history_entry";

export async function test_api_todo_history_entry_create_owned_todo_changes(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // ===== Scenario 1: single field change =====
  const todoA1 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA1);
  const changedTitle1 = RandomGenerator.name(3);
  const history1 =
    await api.functional.todoApp.member.todos.history.createTodoHistoryEntry(
      memberAConnection,
      {
        todoId: todoA1.id,
        body: {
          changedTitle: changedTitle1,
          changedDescription: null,
          changedStartDate: null,
          changedDueDate: null,
          changedCompletionStatus: null,
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(history1);
  TestValidator.equals(
    "history1.todo_app_todo_id matches todoId",
    history1.todo_app_todo_id,
    todoA1.id,
  );
  TestValidator.equals(
    "history1.changed_title matches",
    history1.changed_title,
    changedTitle1,
  );
  TestValidator.equals(
    "history1.changed_description is null",
    history1.changed_description,
    null,
  );
  TestValidator.equals(
    "history1.changed_start_date is null",
    history1.changed_start_date,
    null,
  );
  TestValidator.equals(
    "history1.changed_due_date is null",
    history1.changed_due_date,
    null,
  );
  TestValidator.equals(
    "history1.changed_completion_status is null",
    history1.changed_completion_status,
    null,
  );
  const timeline1 = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todoA1.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(timeline1);
  TestValidator.predicate(
    "history1 is newest (top of timeline)",
    timeline1.data.length > 0 && timeline1.data[0].id === history1.id,
  );
  // ===== Scenario 2: multiple field changes =====
  const todoA2 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA2);
  const dueDate2 = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const history2 =
    await api.functional.todoApp.member.todos.history.createTodoHistoryEntry(
      memberAConnection,
      {
        todoId: todoA2.id,
        body: {
          changedTitle: RandomGenerator.name(2),
          changedDescription: RandomGenerator.paragraph({ sentences: 2 }),
          changedStartDate: null,
          changedDueDate: dueDate2,
          changedCompletionStatus: null,
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(history2);
  TestValidator.equals(
    "history2.todo_app_todo_id matches todoId",
    history2.todo_app_todo_id,
    todoA2.id,
  );
  TestValidator.notEquals(
    "history2.changed_title non-null",
    history2.changed_title,
    null,
  );
  TestValidator.notEquals(
    "history2.changed_description non-null",
    history2.changed_description,
    null,
  );
  TestValidator.equals(
    "history2.changed_start_date is null",
    history2.changed_start_date,
    null,
  );
  TestValidator.equals(
    "history2.changed_due_date matches",
    history2.changed_due_date,
    dueDate2,
  );
  TestValidator.equals(
    "history2.changed_completion_status is null",
    history2.changed_completion_status,
    null,
  );
  const timeline2 = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todoA2.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(timeline2);
  TestValidator.predicate(
    "history2 is newest (top of timeline)",
    timeline2.data.length > 0 && timeline2.data[0].id === history2.id,
  );
  // ===== Scenario 3: empty history creation should fail (no entry created) =====
  const todoA3 = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA3);
  const beforeEmpty = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todoA3.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(beforeEmpty);
  await TestValidator.error(
    "should not create empty todo history entry when all changed_* are null",
    async () => {
      await api.functional.todoApp.member.todos.history.createTodoHistoryEntry(
        memberAConnection,
        {
          todoId: todoA3.id,
          body: {
            changedTitle: null,
            changedDescription: null,
            changedStartDate: null,
            changedDueDate: null,
            changedCompletionStatus: null,
          } satisfies ITodoAppTodoHistoryEntry.ICreate,
        },
      );
    },
  );
  const afterEmpty = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todoA3.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(afterEmpty);
  TestValidator.equals(
    "timeline unchanged after empty history attempt",
    afterEmpty,
    beforeEmpty,
  );
  // ===== Ownership mismatch: memberB cannot create history for memberA todo =====
  const beforeMismatch =
    await api.functional.todoApp.member.todos.history.index(memberAConnection, {
      todoId: todoA1.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    });
  typia.assert(beforeMismatch);
  await TestValidator.error(
    "should reject history creation for another member's todo",
    async () => {
      await api.functional.todoApp.member.todos.history.createTodoHistoryEntry(
        memberBConnection,
        {
          todoId: todoA1.id,
          body: {
            changedTitle: RandomGenerator.name(2),
            changedDescription: null,
            changedStartDate: null,
            changedDueDate: null,
            changedCompletionStatus: null,
          } satisfies ITodoAppTodoHistoryEntry.ICreate,
        },
      );
    },
  );
  const afterMismatch = await api.functional.todoApp.member.todos.history.index(
    memberAConnection,
    {
      todoId: todoA1.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(afterMismatch);
  TestValidator.equals(
    "memberA timeline unchanged after memberB unauthorized history attempt",
    afterMismatch,
    beforeMismatch,
  );
}
