import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validates that an authenticated user can successfully retrieve their own
 * profile information using the /todo/user/actors/me endpoint, immediately
 * after registration.
 *
 * This test ensures:
 *
 * - Registration succeeds with unique/random credentials and returns a valid
 *   authorization (JWT) token
 * - Authenticated profile fetch returns all required metadata (id, email,
 *   created_at, updated_at)
 * - Profile response matches the registered data and omits any sensitive fields
 *   (password, token)
 * - All returned fields comply with expected data formats (uuid, email, ISO
 *   datetime)
 *
 * Test Steps:
 *
 * 1. Register a new user via /auth/user/join, capturing the returned authorized
 *    user data
 * 2. Using the authenticated context, call /todo/user/actors/me to fetch the
 *    current user profile
 * 3. Assert the fetched profile's id, email, created_at, and updated_at match
 *    registration result
 * 4. Assert proper field formats (uuid, email, date-time)
 * 5. Assert sensitive fields (password, token) are not present
 */
export async function test_api_user_profile_retrieval_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain initial authentication context
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies ITodoUser.ICreate;

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationInput,
    });
  typia.assert(authorizedUser);

  // 2. Fetch current authenticated user's profile
  const profile: ITodoUser =
    await api.functional.todo.user.actors.me.at(connection);
  typia.assert(profile);

  // 3. Validate all fields and match with registration result
  TestValidator.equals(
    "profile id matches registration",
    profile.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "profile email matches registration",
    profile.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "profile created_at matches registration",
    profile.created_at,
    authorizedUser.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches registration",
    profile.updated_at,
    authorizedUser.updated_at,
  );

  // 4. Validate correct formats are enforced (typia.assert already covers this)

  // 5. Ensure profile does NOT leak sensitive fields (token, password)
  TestValidator.predicate(
    "profile does not contain authentication/token/sensitive fields",
    () => !("token" in profile) && !("password" in profile),
  );
}
