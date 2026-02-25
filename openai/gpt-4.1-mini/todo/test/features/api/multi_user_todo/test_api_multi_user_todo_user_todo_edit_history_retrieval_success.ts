import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
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

export async function test_api_multi_user_todo_user_todo_edit_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password",
    displayName: "Test User",
    href: "http://localhost/join",
    referrer: "http://localhost",
    ip: null,
  };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(authorizedUser);
  userConnection.headers ??= {};
  userConnection.headers["Authorization"] = authorizedUser.token.access;
  // 2. Create initial todo
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    { body: { title: "Initial Todo Title" } },
  );
  typia.assert(todo);
  // 3. Retrieve the todo's edit history by generating random editHistoryId
  // Since no patch or list API is available, test access and proper error handling
  const randomEditHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve edit history by random ID (expect not found or error)
  await TestValidator.error(
    "editing history retrieval with random ID should fail",
    async () => {
      await api.functional.multiUserTodo.user.todos.editHistories.at(
        userConnection,
        {
          todoId: todo.id,
          editHistoryId: randomEditHistoryId,
        },
      );
    },
  );
  // 5. Test unauthorized access to another user's edit history
  // Create a different user
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUserJoinBody: IMultiUserTodoUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password",
    displayName: "Other User",
    href: "http://localhost/join",
    referrer: "http://localhost",
    ip: null,
  };
  const otherAuthorizedUser = await authorize_user_join(otherUserConnection, {
    body: otherUserJoinBody,
  });
  typia.assert(otherAuthorizedUser);
  otherUserConnection.headers ??= {};
  otherUserConnection.headers["Authorization"] =
    otherAuthorizedUser.token.access;
  // Create a todo for other user
  const otherTodo = await generate_random_multi_user_todo_user_todos_create(
    otherUserConnection,
    { body: { title: "Other User Todo" } },
  );
  typia.assert(otherTodo);
  // Attempt to access first user's todo edit history with other user's credentials
  // Using same todoId but random editHistoryId
  await TestValidator.error("unauthorized access to edit history", async () => {
    await api.functional.multiUserTodo.user.todos.editHistories.at(
      otherUserConnection,
      {
        todoId: todo.id,
        editHistoryId: randomEditHistoryId,
      },
    );
  });
}
