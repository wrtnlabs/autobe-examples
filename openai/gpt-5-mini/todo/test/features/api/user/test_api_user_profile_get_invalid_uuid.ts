import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate GET /todoApp/user/users/{userId} rejects malformed UUID path
 * parameter.
 *
 * Business purpose: Ensures server-side parameter validation prevents malformed
 * identifiers from being processed. A malformed UUID should cause the endpoint
 * to reject the request and produce an error (400 Bad Request).
 *
 * Steps:
 *
 * 1. Register a user via POST /auth/user/join to obtain an authorized session.
 * 2. Assert the join response shape with typia.assert.
 * 3. Attempt to GET the user profile with a malformed userId ("not-a-uuid").
 * 4. Assert that the call fails (TestValidator.error) indicating server-side
 *    validation rejected the malformed UUID.
 */
export async function test_api_user_profile_get_invalid_uuid(
  connection: api.IConnection,
) {
  // 1) Prepare registration body using correct DTO shape
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  // 2) Register (or join) the user. This call also sets connection.headers.Authorization internally.
  const auth: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(auth);

  // 3) Attempt to get user profile with malformed UUID and expect an error
  await TestValidator.error(
    "getting user profile with malformed UUID should fail",
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userId: "not-a-uuid",
      });
    },
  );
}
