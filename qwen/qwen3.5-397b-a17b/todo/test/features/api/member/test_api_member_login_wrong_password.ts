import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login rejection when password does not match the registered account.
 *
 * Validates that the authentication system correctly rejects login attempts with incorrect passwords. This test ensures that bcrypt password verification properly fails when the provided password does not match the stored password_hash, returning a 401 unauthorized response without creating a session record.
 *
 * The test creates a member account with known credentials, then attempts to authenticate using the correct email but an intentionally wrong password. This verifies the security mechanism that protects against unauthorized access through password guessing or credential stuffing attacks.
 *
 * 1. Create a member account with valid email and password using authorize_member_join.
 * 2. Attempt login with the same email but a different/wrong password.
 * 3. Validate that login is rejected with 401 unauthorized error.
 * 4. Verify the original account remains accessible with correct credentials.
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known credentials
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: correctPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Test login with wrong password - should fail with 401
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.todoApp.auth.member.login(loginConnection, {
        body: {
          email: email,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
  // 3. Verify account is still accessible with correct credentials
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLogin = await authorize_member_login(validLoginConnection, {
    body: {
      email: email,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(validLogin);
  // 4. Validate the logged-in member is the same account
  TestValidator.equals("member id matches", member.id, validLogin.id);
  TestValidator.equals("email matches", member.email, validLogin.email);
}
