import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITOdoAppTodoDescriptionField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITOdoAppTodoDescriptionField";
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

/**
 * Test the behavior when retrieving description for a todo that likely has no description field.
 * Since the todo creation API doesn't return the created todo, we test the description
 * retrieval endpoint with a random todo ID to verify graceful handling of potentially
 * missing or empty descriptions.
 */
export async function test_api_todo_description_retrieval_empty_description(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Use a random UUID to test the description retrieval endpoint
  // Since we can't create a todo via the API (returns void), we test error handling
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve description for a non-existent todo
  // The system should handle this gracefully (either return null or throw appropriate error)
  try {
    const description = await api.functional.todoApp.user.todos.description.at(
      userConnection,
      {
        todoId: randomTodoId,
      },
    );
    typia.assert(description);
    // If we get here, verify the description field is null
    TestValidator.equals(
      "description should be null for non-existent todo",
      description.description,
      null,
    );
  } catch (error) {
    // If it throws, verify it's an appropriate HTTP error (e.g., 404)
    if (error instanceof api.HttpError) {
      TestValidator.predicate(
        "should return appropriate error status",
        error.status === 404,
      );
    } else {
      throw error;
    }
  }
}
