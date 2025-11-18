import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test registration of a user account for locked account scenario (untestable).
 *
 * This test documents intent to validate user registration followed by
 * lockout/disabled account authentication but cannot run fully as there is
 * currently no admin locking or lock-state mutation API. The test flow is
 * limited to only registering a new user and validating successful
 * registration, as subsequent lock-related functionality cannot be tested
 * through available endpoints.
 *
 * Steps:
 *
 * 1. Register a user using random email and strong random password.
 * 2. Verify registration succeeds and returns valid ITodoListUser.IAuthorized
 *    structure.
 * 3. (Planned) Lock user account and verify login is prohibited (NOT POSSIBLE
 *    currently).
 * 4. (Planned) Test login fails for locked account (NOT POSSIBLE currently).
 *
 * This test serves as documentation for future coverage once account
 * lock/disable functionality is available.
 */
export async function test_api_user_registration_with_locked_account(
  connection: api.IConnection,
) {
  // 1. Register the user
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
  } satisfies ITodoListUser.ICreate;
  const result = await api.functional.auth.user.join(connection, {
    body: registrationBody,
  });
  typia.assert(result);
  // 2. Validate ITodoListUser.IAuthorized response structure; account lock testing cannot proceed due to lack of API
}
