import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_user_registration_duplicate_email_denied(
  connection: api.IConnection,
) {
  /**
   * Ensure duplicate user registration by email is denied.
   *
   * Business flow:
   *
   * 1. Register a new user with a valid ITodoUser.IJoin payload (unique email).
   * 2. Attempt to register again with the same email using another valid payload.
   * 3. Expect the second attempt to fail due to unique email constraint.
   *
   * Notes:
   *
   * - Response validation relies on typia.assert() which guarantees complete type
   *   correctness.
   * - We assert that the returned email matches the request email for the first
   *   join.
   * - We do not and must not read or manipulate connection headers; the SDK
   *   handles tokens.
   */
  // 1) Prepare valid registration payload with unique email
  const firstJoinBody = typia.random<ITodoUser.IJoin>();

  // 2) Successful registration
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: firstJoinBody },
  );
  typia.assert(authorized);

  // Business assertion: response email echoes the input email
  TestValidator.equals(
    "authorized email matches request email",
    authorized.email,
    firstJoinBody.email,
  );

  // 3) Duplicate registration attempt with same email (other fields still valid)
  const secondJoinBody = {
    ...typia.random<ITodoUser.IJoin>(),
    email: firstJoinBody.email,
  } satisfies ITodoUser.IJoin;

  await TestValidator.error(
    "duplicate email registration should be denied",
    async () => {
      await api.functional.auth.user.join(connection, { body: secondJoinBody });
    },
  );
}
