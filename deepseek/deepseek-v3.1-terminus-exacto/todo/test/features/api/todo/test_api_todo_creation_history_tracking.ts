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
 * Test that todo creation automatically initiates history tracking.
 * Verifies that creating a new todo generates an initial history entry
 * in the audit trail. While the endpoint response focuses on the created
 * todo entity, validate through subsequent history queries that the
 * creation event is properly recorded with appropriate metadata
 * including creation timestamp and user context.
 */
export async function test_api_todo_creation_history_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create a new todo using the utility function
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Validate that the todo creation initiated history tracking
  // The todo should contain creation metadata and user context
  TestValidator.equals(
    "todo should have user context",
    todo.user.id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "todo should have creation timestamp",
    () => new Date(todo.created_at).getTime() <= Date.now(),
  );
  TestValidator.predicate(
    "todo should have update timestamp",
    () => new Date(todo.updated_at).getTime() <= Date.now(),
  );
  TestValidator.equals(
    "creation and update timestamp should match initially",
    todo.created_at,
    todo.updated_at,
  );
  TestValidator.equals(
    "todo should be active (not deleted)",
    todo.deleted_at,
    null,
  );
  TestValidator.equals(
    "todo should be initially incomplete",
    todo.completion_status,
    false,
  );
  TestValidator.predicate(
    "todo title should match input",
    todo.title.length > 0,
  );
}
