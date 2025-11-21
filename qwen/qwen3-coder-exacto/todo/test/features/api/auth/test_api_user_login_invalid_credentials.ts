import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";

export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // First, create a user account to test against
  const joinInput = {
    email: `test-${RandomGenerator.alphabets(10)}@example.com`,
    password: `password-${RandomGenerator.alphabets(15)}`,
  } satisfies ITodoListUserListUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(user);

  // Test 1: Login with wrong email but correct password
  await TestValidator.error(
    "should reject login with wrong email",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: `wrong-${RandomGenerator.alphabets(10)}@example.com`,
          password: joinInput.password,
          href: `${connection.host}/login`,
          referrer: `${connection.host}/`,
          ip: "127.0.0.1",
        } satisfies ITodoListUserListUser.ILogin,
      });
    },
  );

  // Test 2: Login with correct email but wrong password
  await TestValidator.error(
    "should reject login with wrong password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: joinInput.email,
          password: `wrong-${RandomGenerator.alphabets(15)}`,
          href: `${connection.host}/login`,
          referrer: `${connection.host}/`,
          ip: "127.0.0.1",
        } satisfies ITodoListUserListUser.ILogin,
      });
    },
  );

  // Test 3: Login with both wrong email and password
  await TestValidator.error(
    "should reject login with wrong email and password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: `wrong-${RandomGenerator.alphabets(10)}@example.com`,
          password: `wrong-${RandomGenerator.alphabets(15)}`,
          href: `${connection.host}/login`,
          referrer: `${connection.host}/`,
          ip: "127.0.0.1",
        } satisfies ITodoListUserListUser.ILogin,
      });
    },
  );

  // Test 4: Verify that correct credentials still work
  const validLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
      href: `${connection.host}/login`,
      referrer: `${connection.host}/`,
      ip: "127.0.0.1",
    } satisfies ITodoListUserListUser.ILogin,
  });
  typia.assert(validLogin);
  TestValidator.equals(
    "valid login should return user ID",
    validLogin.id,
    user.id,
  );
  TestValidator.equals(
    "valid login should return user email",
    validLogin.email,
    user.email,
  );
}
