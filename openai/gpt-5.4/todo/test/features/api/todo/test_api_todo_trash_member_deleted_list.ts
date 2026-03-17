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

export async function test_api_todo_trash_member_deleted_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  const createdTodos: ITodoAppTodo[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const now: Date = new Date();
      const startDate = new Date(
        now.getTime() + (index + 1) * 60000,
      ).toISOString() satisfies string as string & tags.Format<"date-time">;
      const dueDate = new Date(
        now.getTime() + (index + 2) * 60000,
      ).toISOString() satisfies string as string & tags.Format<"date-time">;
      const todo: ITodoAppTodo =
        await generate_random_todo_app_member_todos_create(memberConnection, {
          body: {
            title: `active-todo-${RandomGenerator.alphabets(8)}-${index}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            startDate,
            dueDate,
          },
        });
      typia.assert(todo);
      return todo;
    },
  );
  TestValidator.equals("created todo count", createdTodos.length, 3);
  const pageNumber = 1 satisfies number as number;
  const pageLimit = 10 satisfies number as number;
  const request: ITodoAppTodo.IRequest = {
    completed: "all",
    sort: "updated_at_desc",
    page: pageNumber,
    limit: pageLimit,
  };
  const trashPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: request,
    });
  typia.assert(trashPage);
  const pagination: IPage.IPagination = trashPage.pagination;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page reflected",
    pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit reflected",
    pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "trash data length does not exceed limit",
    trashPage.data.length <= pagination.limit,
  );
  for (const summary of trashPage.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "trash item deleted_at exists",
      summary.deleted_at !== null,
    );
    TestValidator.predicate(
      "trash item id is not one of newly created active todos",
      createdTodos.every((todo) => todo.id !== summary.id),
    );
  }
  TestValidator.predicate(
    "newly created active todos are not present in trash results",
    createdTodos.every((todo) =>
      trashPage.data.every((summary) => summary.id !== todo.id),
    ),
  );
  const completedOnlyRequest: ITodoAppTodo.IRequest = {
    completed: "complete",
    sort: "created_at_desc",
    page: pageNumber,
    limit: pageLimit,
  };
  const completedOnlyPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.trash.index(memberConnection, {
      body: completedOnlyRequest,
    });
  typia.assert(completedOnlyPage);
  TestValidator.predicate(
    "completed-filter trash data length does not exceed limit",
    completedOnlyPage.data.length <= completedOnlyPage.pagination.limit,
  );
  for (const summary of completedOnlyPage.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "completed-filter item remains deleted",
      summary.deleted_at !== null,
    );
    TestValidator.predicate(
      "completed-filter excludes newly created active todos",
      createdTodos.every((todo) => todo.id !== summary.id),
    );
  }
}
