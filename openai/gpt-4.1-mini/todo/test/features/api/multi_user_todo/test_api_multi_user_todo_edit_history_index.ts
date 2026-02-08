import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_multi_user_todo_edit_history_index(
  connection: api.IConnection,
): Promise<void> {
  // User joins the system
  const userConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoUser.IAuthorized = await authorize_user_join(
    connection,
    { body: {} },
  );
  userConnection.headers = { Authorization: authorized.token.access };
  // User creates a todo
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_user_todos_create(userConnection, {
      body: {
        title: RandomGenerator.name(),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todo);
  // Extract todo id safely
  const todoId = ((): string & tags.Format<"uuid"> => {
    if ("id" in todo && typeof todo.id === "string")
      return todo.id as string & tags.Format<"uuid">;
    throw new Error("todo.id is missing, cannot proceed");
  })();
  // Scenario 1: Retrieve edit history successfully for own todo
  {
    const body: IMultiUserTodoTodoEditHistory.IRequest = {
      page: 1,
      limit: 10,
      title: null,
      description: null,
      start_date: null,
      due_date: null,
      created_at_gte: null,
      created_at_lte: null,
      sort: "-created_at",
    };
    const histories =
      await api.functional.multiUserTodo.user.todos.editHistories.index(
        userConnection,
        {
          todoId,
          body,
        },
      );
    typia.assert(histories);
    TestValidator.predicate(
      "pagination current greater or equal to 1",
      histories.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      histories.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      histories.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      histories.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data array exists",
      Array.isArray(histories.data) && histories.data.length >= 0,
    );
  }
  // Scenario 2: Access edit history with non-existent todoId
  {
    const invalidTodoId: string & tags.Format<"uuid"> = ((typia.random<
      string & tags.Format<"uuid">
    >() ?? "") + "0") as any;
    const body: IMultiUserTodoTodoEditHistory.IRequest = {
      page: 1,
      limit: 10,
      title: null,
      description: null,
      start_date: null,
      due_date: null,
      created_at_gte: null,
      created_at_lte: null,
      sort: "-created_at",
    };
    await TestValidator.error("should fail when todoId not found", async () => {
      await api.functional.multiUserTodo.user.todos.editHistories.index(
        userConnection,
        {
          todoId: invalidTodoId,
          body,
        },
      );
    });
  }
  // Scenario 3: Pagination and filtering
  {
    // Retrieve histories for filtering test
    const body: IMultiUserTodoTodoEditHistory.IRequest = {
      page: 1,
      limit: 3,
      title: null,
      description: null,
      start_date: null,
      due_date: null,
      created_at_gte: null,
      created_at_lte: null,
      sort: "-created_at",
    };
    const filteredHistories =
      await api.functional.multiUserTodo.user.todos.editHistories.index(
        userConnection,
        {
          todoId,
          body,
        },
      );
    typia.assert(filteredHistories);
    TestValidator.predicate(
      "pagination limit respected",
      filteredHistories.pagination.limit === 3,
    );
    TestValidator.predicate(
      "pagination current is 1",
      filteredHistories.pagination.current === 1,
    );
  }
  // Scenario 4: Ensure other user cannot see edit histories of user's todos
  {
    const anotherUserAuth: IMultiUserTodoUser.IAuthorized =
      await authorize_user_join(connection, { body: {} });
    const anotherUserConnection: api.IConnection = { host: connection.host };
    anotherUserConnection.headers = {
      Authorization: anotherUserAuth.token.access,
    };
    const body: IMultiUserTodoTodoEditHistory.IRequest = {
      page: 1,
      limit: 10,
      title: null,
      description: null,
      start_date: null,
      due_date: null,
      created_at_gte: null,
      created_at_lte: null,
      sort: "-created_at",
    };
    await TestValidator.error(
      "another user cannot access other user's todo edit histories",
      async () => {
        await api.functional.multiUserTodo.user.todos.editHistories.index(
          anotherUserConnection,
          {
            todoId,
            body,
          },
        );
      },
    );
  }
}
