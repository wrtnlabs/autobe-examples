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
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_entry_retrieve_owned_success_and_access_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Member A auth
  const memberAJoinConnection: api.IConnection = { host: connection.host };
  const memberAPassword = typia.random<string & tags.Format<"password">>();
  const memberAAuth = await authorize_member_join(memberAJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAAuth);
  const memberALoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberALoginConnection, {
    body: {
      email: memberAAuth.email,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  // Member A create todo
  const todoA = await generate_random_todo_app_member_todos_create(
    memberALoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA);
  // Member A update todo to generate history with changed fields
  const updatedTitle = `${todoA.title} ${RandomGenerator.alphabets(6)}`;
  const updatedDescription: string | null = RandomGenerator.paragraph({
    sentences: 1,
  });
  const updatedStartDate = new Date(Date.now() + 3600000).toISOString();
  const updatedDueDate = new Date(Date.now() + 7200000).toISOString();
  await api.functional.todoApp.member.todos.update(memberALoginConnection, {
    todoId: todoA.id,
    body: {
      title: updatedTitle,
      description: updatedDescription,
      start_date: updatedStartDate,
      due_date: updatedDueDate,
    } satisfies ITodoAppTodo.IUpdate,
  });
  // Retrieve history entries and pick one
  const historyPageA =
    await api.functional.todoApp.member.todos.history_entries.index(
      memberALoginConnection,
      {
        todoId: todoA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppTodoHistoryEntry.IRequest,
      },
    );
  typia.assert(historyPageA);
  const historyEntryIdA = historyPageA.data[0]!.id;
  // Retrieve specific history entry
  const historyEntryA =
    await api.functional.todoApp.member.todos.history_entries.at(
      memberALoginConnection,
      {
        todoId: todoA.id,
        historyEntryId: historyEntryIdA,
      },
    );
  typia.assert(historyEntryA);
  TestValidator.equals("history id matches", historyEntryA.id, historyEntryIdA);
  TestValidator.equals(
    "history todo id matches",
    historyEntryA.todo_app_todo_id,
    todoA.id,
  );
  TestValidator.equals(
    "changed title",
    historyEntryA.changed_title,
    updatedTitle,
  );
  TestValidator.equals(
    "changed description",
    historyEntryA.changed_description,
    updatedDescription,
  );
  TestValidator.equals(
    "changed start date",
    historyEntryA.changed_start_date,
    updatedStartDate,
  );
  TestValidator.equals(
    "changed due date",
    historyEntryA.changed_due_date,
    updatedDueDate,
  );
  TestValidator.equals(
    "changed completion status should be null",
    historyEntryA.changed_completion_status,
    null,
  );
  // Scenario 2: privacy boundary
  const memberBJoinConnection: api.IConnection = { host: connection.host };
  const memberBPassword = typia.random<string & tags.Format<"password">>();
  const memberBAuth = await authorize_member_join(memberBJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuth);
  const memberBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBLoginConnection, {
    body: {
      email: memberBAuth.email,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  await TestValidator.error(
    "member B cannot access member A history entry",
    async () => {
      await api.functional.todoApp.member.todos.history_entries.at(
        memberBLoginConnection,
        {
          todoId: todoA.id,
          historyEntryId: historyEntryIdA,
        },
      );
    },
  );
  // Scenario 3: constrained lookup by todoId + historyEntryId
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberALoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberALoginConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo2);
  await api.functional.todoApp.member.todos.update(memberALoginConnection, {
    todoId: todo1.id,
    body: {
      title: `${todo1.title} ${RandomGenerator.alphabets(4)}`,
      description: null,
      start_date: new Date(Date.now() + 1000 * 60).toISOString(),
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.member.todos.update(memberALoginConnection, {
    todoId: todo2.id,
    body: {
      title: `${todo2.title} ${RandomGenerator.alphabets(4)}`,
      description: null,
      start_date: new Date(Date.now() + 1000 * 120).toISOString(),
      due_date: null,
    } satisfies ITodoAppTodo.IUpdate,
  });
  const page1 = await api.functional.todoApp.member.todos.history_entries.index(
    memberALoginConnection,
    {
      todoId: todo1.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.todoApp.member.todos.history_entries.index(
    memberALoginConnection,
    {
      todoId: todo2.id,
      body: { page: 1, limit: 10 } satisfies ITodoAppTodoHistoryEntry.IRequest,
    },
  );
  typia.assert(page2);
  const historyEntryId1 = page1.data[0]!.id;
  const historyEntryId2 = page2.data[0]!.id;
  await TestValidator.error(
    "historyEntryId constrained to todoId",
    async () => {
      await api.functional.todoApp.member.todos.history_entries.at(
        memberALoginConnection,
        {
          todoId: todo1.id,
          historyEntryId: historyEntryId2,
        },
      );
    },
  );
  // Keep variables referenced to avoid lint complaints in some setups
  TestValidator.predicate(
    "sanity - history entries exist",
    historyEntryId1 !== undefined && historyEntryId2 !== undefined,
  );
}
