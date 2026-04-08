import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login with invalid credentials (wrong password).
 *
 * Validates that the authentication system correctly rejects login attempts when a member provides the correct email address but an incorrect password. This test ensures the system returns 401 Unauthorized for invalid credentials without revealing whether the email exists or the password is wrong, following security best practices.
 *
 * The test first creates a member account with known credentials using the member join utility function. It then attempts to login with the same email but a deliberately wrong password. The login attempt should fail with an authentication error, demonstrating that the password validation logic is working correctly.
 *
 * 1. Create a member account with known email and password credentials.
 * 2. Attempt to login with correct email but wrong password.
 * 3. Validate that the login attempt is rejected with an authentication error.
 * 4. Verify that the error is thrown as expected for invalid credentials.
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with known credentials
  const knownEmail = typia.random<string & tags.Format<"email">>();
  const knownPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(connection, {
    body: {
      email: knownEmail,
      password: knownPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt login with correct email but wrong password
  const wrongPassword = "wrong_password_12345";
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Validate that login fails with authentication error
  await TestValidator.error("invalid password rejected", async () => {
    await authorize_member_login(loginConnection, {
      body: {
        email: knownEmail,
        password: wrongPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallMember.ILogin,
    });
  });
}
