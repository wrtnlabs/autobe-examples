import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with a known password
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {});
  typia.assert(registered);
  const correctPassword = "ValidPass123!";
  // 2. Attempt to login with correct email but WRONG password
  // This should fail with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "login with wrong password returns 401",
    401,
    async () => {
      await api.functional.multiUserTodo.auth.member.login(connection, {
        body: {
          email: registered.email,
          password: "WrongPassword123!",
          href: "https://example.com/login",
          referrer: "https://example.com/",
          ip: "127.0.0.1",
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
  // 3. Attempt login with valid email format but non-existent email
  // Should also return 401 (generic message - no user enumeration)
  await TestValidator.httpError(
    "login with non-existent email returns 401",
    401,
    async () => {
      await api.functional.multiUserTodo.auth.member.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: correctPassword,
          href: "https://example.com/login",
          referrer: "https://example.com/",
          ip: "127.0.0.1",
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
  // 4. Verify the correct password still works
  const successfulLogin = await api.functional.multiUserTodo.auth.member.login(
    connection,
    {
      body: {
        email: registered.email,
        password: correctPassword,
        href: "https://example.com/login",
        referrer: "https://example.com/",
        ip: "127.0.0.1",
      } satisfies IMultiUserTodoMember.ILogin,
    },
  );
  typia.assert(successfulLogin);
  TestValidator.equals(
    "email matches registered email",
    successfulLogin.email,
    registered.email,
  );
  TestValidator.predicate(
    "has valid access token",
    !!successfulLogin.token.access,
  );
  TestValidator.predicate(
    "has valid refresh token",
    !!successfulLogin.token.refresh,
  );
  // 5. Verify repeated failed attempts continue to return 401
  await TestValidator.httpError(
    "repeated wrong password still returns 401",
    401,
    async () => {
      await api.functional.multiUserTodo.auth.member.login(connection, {
        body: {
          email: registered.email,
          password: "AnotherWrongPass!",
          href: "https://example.com/login",
          referrer: "https://example.com/",
          ip: "127.0.0.1",
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
}
