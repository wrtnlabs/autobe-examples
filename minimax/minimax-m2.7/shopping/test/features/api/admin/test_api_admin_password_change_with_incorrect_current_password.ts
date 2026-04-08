import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
 * Test the admin password change operation when current password verification fails.
 *
 * Validates that attempting to change an admin password with an incorrect current
 * password returns 401 Unauthorized. Verifies that the error message indicates the
 * current password is incorrect and that the password remains unchanged in the
 * database.
 *
 * **Test Steps:**
 * 1. Register a new admin account with valid credentials using /ecommerceMall/auth/admin/join.
 * 2. Create a new connection authenticated with the admin account.
 * 3. Attempt to change password with incorrect current password using PUT /ecommerceMall/admin/admin/password.
 * 4. Provide newPassword with a valid new password meeting security requirements.
 *
 * **Expected Results:**
 * - Response status: 401 Unauthorized
 * - Error message indicates the current password is incorrect
 * - The password remains unchanged in the database
 */
export async function test_api_admin_password_change_with_incorrect_current_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account with valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const registeredPassword = RandomGenerator.alphaNumeric(12);
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registeredPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Attempt password change with incorrect current password
  const incorrectCurrentPassword = "wrong_password_12345";
  const newPassword = RandomGenerator.alphaNumeric(12);
  // 3. Expect 401 Unauthorized due to incorrect current password
  await TestValidator.httpError(
    "password change with incorrect current password returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.admin.admin.password.update(
        adminConnection,
        {
          body: {
            currentPassword: incorrectCurrentPassword,
            newPassword: newPassword,
          } satisfies IEcommerceMallAdmin.IPasswordUpdate,
        },
      ),
  );
}
