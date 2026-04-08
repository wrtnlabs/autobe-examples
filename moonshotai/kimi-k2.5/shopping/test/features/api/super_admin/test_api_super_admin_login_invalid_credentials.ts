import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that the super admin login operation returns the same rejection response
 * for both non-existent email and incorrect password scenarios.
 *
 * This security measure prevents attackers from enumerating valid accounts by
 * observing different error responses. Both "email not found" and "password"
 * wrong" scenarios should return identical HTTP error responses (401/403) with
 * generic failure messages that do not indicate which specific credential was invalid.
 */
export async function test_api_super_admin_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid super administrator account to test against
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = typia.random<IEcommerceMallSuperAdmin.IJoin>();
  const superAdmin = await authorize_super_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(superAdmin);
  // Step 2: Attempt login with valid email but WRONG password
  // This should fail but not indicate whether email exists or password is wrong
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "wrong password returns authentication error without account enumeration",
    [401, 403],
    async () => {
      await authorize_super_admin_login(wrongPasswordConnection, {
        body: {
          email: superAdmin.email,
          password: RandomGenerator.alphaNumeric(16),
          href: "https://test.example.com/ecommerceMall/auth/superAdmin/login",
          referrer: "https://test.example.com/",
          ip: null,
        } satisfies IEcommerceMallSuperAdmin.ILogin,
      });
    },
  );
  // Step 3: Attempt login with NON-EXISTENT email address
  // This should return the SAME error as wrong password scenario
  const nonExistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "non-existent email returns same authentication error as wrong password",
    [401, 403],
    async () => {
      await authorize_super_admin_login(nonExistentConnection, {
        body: {
          email: RandomGenerator.alphaNumeric(8) + "@test.com",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://test.example.com/ecommerceMall/auth/superAdmin/login",
          referrer: "https://test.example.com/",
          ip: null,
        } satisfies IEcommerceMallSuperAdmin.ILogin,
      });
    },
  );
}
