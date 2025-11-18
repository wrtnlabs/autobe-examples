import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_login(connection: api.IConnection) {
  // Create a user account using join endpoint for login testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoin = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    referrer: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListUser.ICreate;
  const joinedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoin });
  typia.assert(joinedUser);

  // Test successful user login with valid credentials and session context
  const userLogin = {
    email: userEmail,
    password: userJoin.password,
    href: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    referrer: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListUser.ILogin;
  const loginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: userLogin });
  typia.assert(loginResult);
  TestValidator.equals("user email matches", loginResult.email, userEmail);

  // Test failed login with invalid password
  const invalidPasswordLogin = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    referrer: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error("invalid password should fail", async () => {
    await api.functional.auth.user.login(connection, {
      body: invalidPasswordLogin,
    });
  });

  // Test failed login with invalid email (valid format but non-existent account)
  const invalidEmailLogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SomePassword123!",
    href: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    referrer: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITodoListUser.ILogin;
  await TestValidator.error("invalid email should fail", async () => {
    await api.functional.auth.user.login(connection, {
      body: invalidEmailLogin,
    });
  });
}
