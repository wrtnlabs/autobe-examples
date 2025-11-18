import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that user registration prevents duplicate emails.
 *
 * 1. Register a user with a random unique email and valid password.
 * 2. Attempt to register another user with the same email but a different valid
 *    password.
 * 3. Expect the second registration to fail due to unique email constraint.
 * 4. Ensure no type errors or invalid requests are sent.
 */
export async function test_api_user_registration_duplicate_email_rejection(
  connection: api.IConnection,
) {
  // 1. Register a user with a unique, valid email and valid password
  const registrationData = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;

  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: registrationData },
  );
  typia.assert(user1);
  TestValidator.equals(
    "registered user email matches input",
    user1.email,
    registrationData.email,
  );

  // 2. Attempt to register another user with the same email but new valid password
  const registrationDataDup = {
    email: registrationData.email,
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;

  await TestValidator.error(
    "should reject duplicate user registration with same email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: registrationDataDup,
      });
    },
  );
}
