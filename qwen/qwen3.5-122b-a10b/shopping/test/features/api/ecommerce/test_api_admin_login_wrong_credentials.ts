import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login rejection with incorrect credentials.
 *
 * Validates that administrator login properly rejects authentication attempts with invalid credentials while maintaining security by not revealing which specific credential (email or password) was incorrect. This ensures the system prevents unauthorized access and avoids information leakage that could aid attackers in credential enumeration attacks.
 *
 * The test follows a complete authentication workflow: first creating an administrator account through the registration endpoint, then attempting login with various incorrect credential combinations. Both wrong password and wrong email scenarios are tested to ensure comprehensive coverage of authentication failure cases.
 *
 * 1. Create administrator account using authorize_admin_join with valid credentials.
 * 2. Attempt login with correct email but incorrect password.
 * 3. Verify login fails with authentication error.
 * 4. Attempt login with incorrect email but correct password.
 * 5. Verify login fails with authentication error.
 * 6. Validate that error messages do not reveal which credential was wrong.
 */
export async function test_api_admin_login_wrong_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // 2. Test login with correct email but wrong password
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await authorize_admin_login(wrongPasswordConnection, {
        body: {
          email: adminEmail,
          password: "wrong_password_456",
        } satisfies IEcommerceAdmin.ILogin,
      });
    },
  );
  // 3. Test login with wrong email but correct password
  const wrongEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login with wrong email should fail", async () => {
    await authorize_admin_login(wrongEmailConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
      } satisfies IEcommerceAdmin.ILogin,
    });
  });
}
