import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate duplicate email constraint during todo user registration.
 *
 * This test ensures that the /auth/user/join endpoint correctly enforces unique
 * email constraints. The API should not allow two users to register with the
 * same email address.
 *
 * Steps:
 *
 * 1. Register a new todo user with a random unique email (user A), valid password,
 *    href, and referrer.
 * 2. Attempt to register another user with exactly the same email and other valid
 *    registration info.
 * 3. The first registration must succeed and return a valid ITodoUser.IAuthorized
 *    response.
 * 4. The second registration attempt with the duplicate email must fail with an
 *    appropriate error, confirming the uniqueness constraint works correctly.
 */
export async function test_api_todo_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Prepare valid user registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ipOpts = [
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
    null,
    undefined,
  ] as const;
  const ip = RandomGenerator.pick(ipOpts);

  const registrationBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoUser.ICreate;

  // Step 2: Register the initial user (should succeed)
  const userA: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: registrationBody,
    },
  );
  typia.assert(userA);
  TestValidator.equals("userA email matches input", userA.email, email);

  // Step 3: Attempt duplicate registration (should fail)
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: registrationBody,
      });
    },
  );
}
