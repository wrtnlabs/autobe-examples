import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_malformed_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish system state
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(newUser);

  // Step 2: Test retrieval with malformed (non-UUID) user ID
  // The endpoint expects a UUID, but we'll pass a malformed string to verify validation
  await TestValidator.error(
    "should reject malformed userId (not UUID format)",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: "not-a-uuid", // Malformed ID - should trigger validation error
      });
    },
  );

  // Step 3: Test with another malformed format
  await TestValidator.error(
    "should reject malformed userId (numeric string)",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: "12345", // Invalid UUID format
      });
    },
  );

  // Step 4: Test with empty string
  await TestValidator.error("should reject empty userId", async () => {
    await api.functional.todoList.user.actors.at(connection, {
      userId: "", // Empty string - should trigger validation error
    });
  });

  // Step 5: Test with null value (though type is string, sending undefined in request)
  // Note: actual placeholder handling indicates system sends "null" as string
  await TestValidator.error(
    "should reject null/'null' string userId",
    async () => {
      await api.functional.todoList.user.actors.at(connection, {
        userId: "null", // String "null" - should trigger validation error
      });
    },
  );
}
