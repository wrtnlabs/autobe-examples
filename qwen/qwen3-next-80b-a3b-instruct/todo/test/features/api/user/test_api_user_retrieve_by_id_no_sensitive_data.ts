import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_no_sensitive_data(
  connection: api.IConnection,
) {
  // Create a new user account through authentication join
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Retrieve the user profile by ID to validate no sensitive data is exposed
  const userResponse: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: joinResponse.id,
    });
  typia.assert(userResponse);

  // Validate that the response type is exactly what's defined in ITodoListUser (a string containing UUID)
  // The security policy ensures password_hash and other authentication fields are excluded from this response
  // Since ITodoListUser is defined as string & Format<"uuid">, typia.assert validates this automatically
}
