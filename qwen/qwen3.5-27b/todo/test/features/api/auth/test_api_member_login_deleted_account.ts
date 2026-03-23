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

export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test login attempt verification for member authentication.
   *
   * This test verifies that:
   * 1. A member account can be successfully registered
   * 2. Login with correct credentials succeeds
   * 3. Login with incorrect credentials is properly rejected
   * 4. Authentication tokens are only issued for valid logins
   *
   * Note: Full "deleted account" testing requires admin API access to soft-delete
   * accounts, which is not available in the current SDK. This test validates
   * the authentication flow and credential verification.
   */
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IMultiUserTodoMember.IJoin;
  const registeredMember = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(registeredMember);
  // Verify account is active (not deleted)
  TestValidator.equals("account is active", registeredMember.deleted_at, null);
  TestValidator.equals(
    "email matches registration",
    registeredMember.email,
    joinBody.email,
  );
  // 2. Test successful login with correct credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinBody.email,
      password: joinBody.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loginResult);
  // Verify successful login returns valid tokens
  TestValidator.equals("user ID matches", loginResult.id, registeredMember.id);
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "account still active after login",
    loginResult.deleted_at === null,
  );
  // 3. Test login rejection with incorrect password
  await TestValidator.error("login rejected with wrong password", async () => {
    const wrongPasswordConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(wrongPasswordConnection, {
      body: {
        email: joinBody.email,
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IMultiUserTodoMember.ILogin,
    });
  });
  // 4. Test login rejection with non-existent email
  await TestValidator.error(
    "login rejected with non-existent email",
    async () => {
      const nonExistentConnection: api.IConnection = { host: connection.host };
      await authorize_member_login(nonExistentConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
}
