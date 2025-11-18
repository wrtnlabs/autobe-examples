import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that an authenticated user can correctly retrieve detailed
 * information for a specific user by userId.
 *
 * 1. Register (join) as a new user to create an authenticated session for the
 *    test.
 * 2. Use the issued user id from registration to fetch the user details.
 * 3. Validate that all main user fields (id, email, display_name, created_at,
 *    updated_at) are present and values match those from registration.
 * 4. Ensure no authentication credential (such as password or token) or
 *    confidential fields are leaked in the user detail response.
 * 5. Assert that access control works: fetching details for a valid userId is
 *    permitted, but fetching a random/inexistent userId returns an error.
 */
export async function test_api_user_detail_retrieval_with_valid_authentication(
  connection: api.IConnection,
) {
  // 1. Register (join) as a new user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoListUser.ICreate;

  const joinOutput: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(joinOutput);

  // Use the user id for detail retrieval
  const userId = joinOutput.id;

  // 2. Retrieve user details for the created user id
  const userDetail: ITodoListUser = await api.functional.todoList.user.users.at(
    connection,
    {
      userId: userId,
    },
  );
  typia.assert(userDetail);

  // 3. Validate returned fields match registration
  TestValidator.equals("user id matches", userDetail.id, joinOutput.id);
  TestValidator.equals(
    "user email matches",
    userDetail.email,
    joinOutput.email,
  );
  TestValidator.equals(
    "user display_name matches",
    userDetail.display_name,
    joinOutput.display_name,
  );
  TestValidator.equals(
    "user created_at matches",
    userDetail.created_at,
    joinOutput.created_at,
  );
  TestValidator.equals(
    "user updated_at matches",
    userDetail.updated_at,
    joinOutput.updated_at,
  );

  // 4. Ensure sensitive information is not present
  TestValidator.predicate(
    "no confidential authentication fields leaked (password/token)",
    !Object.prototype.hasOwnProperty.call(userDetail, "password") &&
      !Object.prototype.hasOwnProperty.call(userDetail, "token"),
  );

  // 5. Fetch user details for a nonexistent userId should error
  await TestValidator.error(
    "retrieving details for a non-existent userId returns error",
    async () => {
      await api.functional.todoList.user.users.at(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
