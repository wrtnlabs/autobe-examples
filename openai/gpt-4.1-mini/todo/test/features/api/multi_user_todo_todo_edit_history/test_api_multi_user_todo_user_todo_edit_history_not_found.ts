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

export async function test_api_multi_user_todo_user_todo_edit_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a non-existent todo edit history entry for an authenticated user.
  // 1. User joins and gets authorized
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IMultiUserTodoUser.IJoin;
  const authorized = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a todo for the user
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Query a non-existent edit history entry
  const nonExistentEditHistoryId = typia.random<string & tags.Format<"uuid">>();
  // Use the utility function provided for the GET editHistory endpoint
  // Expect HTTP 404 error
  await TestValidator.httpError(
    "non-existent edit history entry should 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.todos.editHistories.at(
        userConnection,
        {
          todoId: todo.id,
          editHistoryId: nonExistentEditHistoryId,
        },
      );
    },
  );
}
