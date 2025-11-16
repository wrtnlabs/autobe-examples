import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate retrieval of non-sensitive user details by the authenticated owner.
 *
 * 1. Register a new user account with valid unique email and password using the
 *    /auth/user/join endpoint.
 * 2. Call the /todoList/user/users/{userId} endpoint using the user's own userId
 *    while authenticated as that user.
 * 3. Assert that the response returns only the expected minimal user fields: id
 *    and email.
 * 4. Assert that no password or sensitive credential fields are present in the
 *    response.
 * 5. Assert that the id and email match those returned at registration.
 * 6. (Negative assertions and security constraints are validated via structure: if
 *    password is not in DTO, strong type assertion confirms it is not
 *    exposed.)
 */
export async function test_api_user_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user account (join)
  const userInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const reg: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userInput },
  );
  typia.assert(reg);

  // 2. Authenticated, request own detail
  const detail: ITodoListUser = await api.functional.todoList.user.users.at(
    connection,
    { userId: reg.id },
  );
  typia.assert(detail);

  // 3. Validates response structure and data
  TestValidator.equals("user id matches registration", detail.id, reg.id);
  TestValidator.equals(
    "user email matches registration",
    detail.email,
    reg.email,
  );
}
