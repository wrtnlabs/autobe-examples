import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_timestamp_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Use the user ID to retrieve the account
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: createdUser.id,
    });
  typia.assert(retrievedUser);

  // Step 3: Validate that the returned string is a valid UUID format
  TestValidator.predicate(
    "retrieved user is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedUser,
    ),
  );
}
