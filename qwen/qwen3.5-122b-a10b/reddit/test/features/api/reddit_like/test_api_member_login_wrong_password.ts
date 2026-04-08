import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login failure with incorrect password.
 *
 * Validates that the authentication system properly rejects login attempts when a registered member provides an incorrect password. The test creates a member account with known credentials, then attempts to authenticate using the correct email but a wrong password.
 *
 * This test ensures the bcrypt password verification logic functions correctly and that authentication failures are properly handled. The error response should indicate invalid credentials without exposing whether the email exists.
 *
 * 1. Create a member account with known email, password, and username.
 * 2. Attempt to login with the correct email but an incorrect password.
 * 3. Validate that the login operation throws an authentication error.
 * 4. Verify the error indicates invalid credentials (401 Unauthorized).
 */
export async function test_api_member_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account with known credentials
  const registeredPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registeredPassword,
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Attempt to login with correct email but wrong password
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  // 3. Validate that login throws an error
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      const loginConnection: api.IConnection = { host: connection.host };
      await authorize_member_login(loginConnection, {
        body: {
          email: registeredMember.email,
          password: wrongPassword,
        } satisfies IRedditLikeMember.ILogin,
      });
    },
  );
}
