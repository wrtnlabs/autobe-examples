import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_excessive_headers(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with 100+ custom headers
  // Generate realistic test data using typia.random and RandomGenerator
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  // Create a connection with 100+ custom headers as specified in scenario
  const connectionWithExcessHeaders: api.IConnection = {
    ...connection,
    headers: {
      // 100+ custom headers with realistic names and values
      ...ArrayUtil.repeat(100, (i) => ({
        [`X-Custom-Header-${i + 1}`]: RandomGenerator.alphaNumeric(20),
      })).reduce((acc, header) => ({ ...acc, ...header }), {}),
    },
  };

  // Execute the join operation with excess headers
  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connectionWithExcessHeaders, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);

  // Step 2: Retrieve the user account using the ID from the join response
  // Use the base connection (without excessive headers) as specified in scenario
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: newUser.id,
    });
  typia.assert(retrievedUser);

  // Step 3: Validate that the retrieved user matches the created user
  TestValidator.equals(
    "retrieved user ID matches created user ID",
    retrievedUser,
    newUser.id,
  );
}
