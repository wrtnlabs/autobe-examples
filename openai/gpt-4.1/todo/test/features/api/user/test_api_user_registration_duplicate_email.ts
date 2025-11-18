import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration API rejects duplicate emails (/auth/user/join).
 *
 * 1. Register a user with a unique, random email address to ensure it exists
 *    (prerequisite).
 * 2. Attempt registration with the same email but a different password and session
 *    metadata.
 * 3. The duplicate registration should fail; assert error is thrown to confirm
 *    uniqueness enforcement.
 */
export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  const email = typia.random<
    string & tags.MinLength<5> & tags.MaxLength<255> & tags.Format<"email">
  >();
  const firstJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://www.todolist-app.com/signup",
    referrer: "https://www.todolist-app.com/",
  } satisfies ITodoListUser.IJoin;

  const firstJoin = await api.functional.auth.user.join(connection, {
    body: firstJoinBody,
  });
  typia.assert(firstJoin);

  const secondJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(14),
    href: "https://www.todolist-app.com/dup",
    referrer: "https://www.todolist-app.com/from-test",
  } satisfies ITodoListUser.IJoin;

  await TestValidator.error(
    "should reject registration with duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, { body: secondJoinBody });
    },
  );
}
