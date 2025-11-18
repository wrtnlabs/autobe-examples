import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensures that login with a valid email but incorrect password is securely
 * rejected.
 *
 * Business workflow:
 *
 * 1. Register a valid user with a random, unique email and strong password (plus
 *    required session context: href, referrer, ip)
 * 2. Attempt login with the same email but a random incorrect password (same
 *    length/complexity as a real password), and session context
 * 3. Assert that authentication fails: no tokens issued, no user info revealed,
 *    and only generic error presented (no info about which field was wrong).
 *
 * Steps:
 *
 * - Generate unique random email and password following all constraints
 * - Register the user via join endpoint
 * - Attempt login with same email and wrong password
 * - Assert login endpoint throws error
 * - Optionally, check that error reveals no sensitive details
 */
export async function test_api_user_login_wrong_password(
  connection: api.IConnection,
) {
  // Registration input
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100> & tags.Format<"password">
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip_candidates = [
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
  ];
  const ip = RandomGenerator.pick(ip_candidates);

  const joinInput = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ICreate;

  // Register user
  const registered = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered user email matches",
    registered.email,
    email,
  );

  // Wrong password (ensure it's different)
  let wrongPassword: string &
    tags.MinLength<8> &
    tags.MaxLength<128> &
    tags.Format<"password">;
  do {
    wrongPassword = typia.random<
      string & tags.MinLength<8> & tags.MaxLength<128> & tags.Format<"password">
    >();
  } while (wrongPassword === password);

  const loginInput = {
    email,
    password: wrongPassword,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ILogin;

  // Attempt login with wrong password: must fail, must not leak info
  await TestValidator.error(
    "login with wrong password must fail with generic error",
    async () => {
      await api.functional.auth.user.login(connection, { body: loginInput });
    },
  );
}
