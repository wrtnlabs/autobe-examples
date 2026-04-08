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
 * Test member login attempt with correct email but incorrect password.
 *
 * Validates that the authentication system correctly rejects login attempts when the provided password does not match the stored hash for the registered email address. This test verifies the BCrypt password verification logic and ensures that unauthorized access attempts are properly blocked.
 *
 * Special attention is given to verifying that the system returns an appropriate error when credentials are invalid, preventing unauthorized access to member accounts.
 *
 * 1. Register a new member account with unique email and password.
 * 2. Attempt to login with the registered email but an incorrect password.
 * 3. Verify that the login attempt fails with an HTTP error.
 * 4. Ensure no authentication tokens are returned for invalid credentials.
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      password: correctPassword,
    },
  });
  typia.assert(member);
  // 2. Attempt login with correct email but incorrect password
  const incorrectPassword = RandomGenerator.alphaNumeric(16);
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Verify that login fails with HTTP error
  await TestValidator.httpError(
    "login with incorrect password should fail",
    401,
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: member.email,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppMember.ILogin,
      });
    },
  );
}
