import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that users cannot access todos owned by other users, enforcing privacy and data isolation.
 *
 * Create two separate user accounts through the join endpoint - User A and User B.
 * User A creates a todo 'Private Todo' via the todo creation endpoint.
 * User B attempts to retrieve User A's todo using the target endpoint with User A's todo ID.
 * The system should return a 404 Not Found response to prevent information disclosure about other users' todos.
 * Verify that there's no data leak or indication that the todo exists but belongs to another user.
 * Confirm proper privacy enforcement as specified in the business requirements.
 */
export async function test_api_todo_retrieval_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two separate user accounts
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser").ITodoAppUser.IJoin
    > as DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser").ITodoAppUser.IJoin
    >,
  });
  typia.assert(userAAuthorized);
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser").ITodoAppUser.IJoin
    > as DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser").ITodoAppUser.IJoin
    >,
  });
  typia.assert(userBAuthorized);
  // Step 2: User A creates a todo
  const userATodo = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(userATodo);
  // Step 3: User B attempts to retrieve User A's todo
  await TestValidator.httpError(
    "User B should get 404 when trying to access User A's todo",
    404,
    async () => {
      await api.functional.todoApp.user.todos.at(userBConnection, {
        todoId: userATodo.id,
      });
    },
  );
  // Step 4: Verify User A can still access their own todo
  const userATodoRetrieved = await api.functional.todoApp.user.todos.at(
    userAConnection,
    {
      todoId: userATodo.id,
    },
  );
  typia.assert(userATodoRetrieved);
  TestValidator.equals(
    "User A should be able to retrieve their own todo",
    userATodoRetrieved.id,
    userATodo.id,
  );
}
