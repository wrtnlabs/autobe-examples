import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_retrieve_own_edit_history(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `todo-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = true;
  const authorized = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(authorized);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: authorized.token.access,
  };
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        start_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        due_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const firstUpdatedTitle = `${todo.title} updated 1`;
  const firstUpdatedDescription = `${todo.description ?? ""} updated 1`;
  const firstUpdatedStartAt = new Date(
    Date.now() - 1000 * 60 * 30,
  ).toISOString();
  const firstUpdatedDueAt = new Date(Date.now() + 1000 * 60 * 90).toISOString();
  const firstUpdatedTodo =
    await api.functional.todoApp.member.todos.patchByTodoid(memberConnection, {
      todoId: todo.id,
      body: {
        title: firstUpdatedTitle,
        description: firstUpdatedDescription,
        start_at: firstUpdatedStartAt,
        due_at: firstUpdatedDueAt,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(firstUpdatedTodo);
  const secondUpdatedTitle = `${firstUpdatedTodo.title} updated 2`;
  const secondUpdatedDescription = `${firstUpdatedTodo.description ?? ""} updated 2`;
  const secondUpdatedStartAt = new Date(
    Date.now() - 1000 * 60 * 10,
  ).toISOString();
  const secondUpdatedDueAt = new Date(
    Date.now() + 1000 * 60 * 120,
  ).toISOString();
  const secondUpdatedTodo =
    await api.functional.todoApp.member.todos.patchByTodoid(memberConnection, {
      todoId: todo.id,
      body: {
        title: secondUpdatedTitle,
        description: secondUpdatedDescription,
        start_at: secondUpdatedStartAt,
        due_at: secondUpdatedDueAt,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(secondUpdatedTodo);
  const history =
    await api.functional.todoApp.member.todos.histories.patchByTodoid(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          pageSize: 10,
          sort: "created_at",
          order: "asc",
          limit: 10,
        } satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "history pagination current",
    history.pagination.current,
    1,
  );
  TestValidator.equals(
    "history pagination limit",
    history.pagination.limit,
    10,
  );
  TestValidator.equals(
    "history pagination records",
    history.pagination.records,
    history.data.length,
  );
  TestValidator.predicate(
    "history has multiple entries",
    history.data.length >= 2,
  );
  TestValidator.predicate(
    "history entries are ordered newest to oldest",
    history.data.every(
      (entry, index, array) =>
        index === 0 || array[index - 1].editedAt >= entry.editedAt,
    ),
  );
  TestValidator.predicate(
    "history entries belong to the requested todo",
    history.data.every((entry) => entry.todo.id === todo.id),
  );
  TestValidator.predicate(
    "history entries include parent todo context",
    history.data.every((entry) => entry.todo.member.id === authorized.id),
  );
  TestValidator.equals(
    "latest history title",
    history.data[0].title,
    secondUpdatedTitle,
  );
  TestValidator.equals(
    "latest history description",
    history.data[0].description,
    secondUpdatedDescription,
  );
  TestValidator.equals(
    "latest history startAt",
    history.data[0].startAt,
    secondUpdatedStartAt,
  );
  TestValidator.equals(
    "latest history dueAt",
    history.data[0].dueAt,
    secondUpdatedDueAt,
  );
}
