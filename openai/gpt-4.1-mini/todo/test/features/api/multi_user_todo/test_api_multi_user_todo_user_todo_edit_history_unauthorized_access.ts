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

export async function test_api_multi_user_todo_user_todo_edit_history_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Preconditions: Two users are registered and each creates a todo.
  // 1. Register first user and create authenticated connection
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuth = await authorize_user_join(firstUserConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "password123",
      displayName: `User_${RandomGenerator.alphabets(5)}`,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    },
  });
  firstUserConnection.headers = {
    Authorization: firstUserAuth.token.access,
  };
  // 2. First user creates a todo
  const firstTodo = await generate_random_multi_user_todo_user_todos_create(
    firstUserConnection,
    { body: { title: `FirstTodo ${RandomGenerator.name()}` } },
  );
  typia.assert(firstTodo);
  // 3. Register second user and create authenticated connection
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuth = await authorize_user_join(secondUserConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      password: "password456",
      displayName: `User_${RandomGenerator.alphabets(5)}`,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    },
  });
  secondUserConnection.headers = {
    Authorization: secondUserAuth.token.access,
  };
  // 4. Second user creates a todo
  const secondTodo = await generate_random_multi_user_todo_user_todos_create(
    secondUserConnection,
    { body: { title: `SecondTodo ${RandomGenerator.name()}` } },
  );
  typia.assert(secondTodo);
  // 5. Retrieve first user's todo edit history entries to find one editHistoryId
  // Since no utility function is provided for listing edit histories, assume
  // at least create one edit history via updating the todo or direct fetch
  // For this test, manual fetch of the editHistories.at with a fake id to provoke error.
  // We attempt to access an edit history of first user's todo from the second user
  // We generate a random UUID for editHistoryId to simulate unauthorized attempt
  const fakeEditHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 6. The second user tries to access the edit history of first user's todo
  // and expects a 404 or access denied error
  await TestValidator.httpError(
    "unauthorized access to another user's todo edit history",
    404,
    async () => {
      await api.functional.multiUserTodo.user.todos.editHistories.at(
        secondUserConnection,
        {
          todoId: firstTodo.id,
          editHistoryId: fakeEditHistoryId,
        },
      );
    },
  );
}
