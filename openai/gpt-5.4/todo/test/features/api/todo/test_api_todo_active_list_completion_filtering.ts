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

export async function test_api_todo_active_list_completion_filtering(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const page = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>;
  const listLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const emptyLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const incompleteTitle = `incomplete-${RandomGenerator.alphaNumeric(8)}`;
  const completeTitle = `complete-${RandomGenerator.alphaNumeric(8)}`;
  const incompleteTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: incompleteTitle,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(incompleteTodo);
  const todoToComplete = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: completeTitle,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todoToComplete);
  const updatedCompletedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todoToComplete.id,
      body: {
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedCompletedTodo);
  TestValidator.equals(
    "updated todo id matches target",
    updatedCompletedTodo.id,
    todoToComplete.id,
  );
  TestValidator.equals(
    "updated todo completed state is true",
    updatedCompletedTodo.completed,
    true,
  );
  const completePage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "complete",
        page,
        limit: listLimit,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completePage);
  TestValidator.predicate(
    "complete page contains only completed active todos",
    completePage.data.every(
      (todo) => todo.completed === true && todo.deleted_at === null,
    ),
  );
  TestValidator.predicate(
    "complete page includes the completed todo",
    completePage.data.some((todo) => todo.id === updatedCompletedTodo.id),
  );
  TestValidator.predicate(
    "complete page excludes the incomplete todo",
    completePage.data.every((todo) => todo.id !== incompleteTodo.id),
  );
  const incompletePage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: "incomplete",
        page,
        limit: listLimit,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompletePage);
  TestValidator.predicate(
    "incomplete page contains only incomplete active todos",
    incompletePage.data.every(
      (todo) => todo.completed === false && todo.deleted_at === null,
    ),
  );
  TestValidator.predicate(
    "incomplete page includes the incomplete todo",
    incompletePage.data.some((todo) => todo.id === incompleteTodo.id),
  );
  TestValidator.predicate(
    "incomplete page excludes the completed todo",
    incompletePage.data.every((todo) => todo.id !== updatedCompletedTodo.id),
  );
  const emptySearch = `no-match-${RandomGenerator.alphaNumeric(12)}`;
  const emptyPage = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: emptySearch,
        completed: "complete",
        page,
        limit: emptyLimit,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty page current pagination preserved",
    emptyPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "empty page limit pagination preserved",
    emptyPage.pagination.limit,
    emptyLimit,
  );
  TestValidator.equals(
    "empty page has no records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page has no pages",
    emptyPage.pagination.pages,
    0,
  );
  TestValidator.equals("empty page data is empty", emptyPage.data.length, 0);
}
