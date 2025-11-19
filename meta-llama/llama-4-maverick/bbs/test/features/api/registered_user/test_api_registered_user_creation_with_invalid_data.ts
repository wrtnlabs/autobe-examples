import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

/**
 * Test creation of a new registered user with invalid data. This scenario
 * checks that the API rejects invalid user data (e.g., missing required fields,
 * invalid email format) and returns appropriate error responses.
 */
export async function test_api_registered_user_creation_with_invalid_data(
  connection: api.IConnection,
) {
  // Authenticate as a registered user to attempt creation
  const registeredUser = await api.functional.auth.registered_user.join(
    connection,
    {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    },
  );
  typia.assert(registeredUser);

  // Test invalid email format
  await TestValidator.error(
    "invalid email should be rejected",
    async () =>
      await api.functional.discussionBoard.registeredUsers.create(connection, {
        body: "invalid_email" as any,
      }),
  );

  // Test missing required fields (email)
  await TestValidator.error(
    "missing email should be rejected",
    async () =>
      await api.functional.discussionBoard.registeredUsers.create(connection, {
        body: "",
      }),
  );
}
