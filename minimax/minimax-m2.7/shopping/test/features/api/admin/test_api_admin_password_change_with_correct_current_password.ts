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
 * Test admin password change operation with correct current password.
 *
 * Validates the admin password change flow when the correct current password is provided. This test ensures that administrators can successfully update their password after identity verification.
 *
 * The test flow includes:
 * 1. Registering a new admin account with unique credentials
 * 2. Updating the password using the correct current password
 * 3. Verifying the success response message
 *
 * The admin session remains active after the password change operation, allowing the administrator to continue using the system with the new credentials.
 */
export async function test_api_admin_password_change_with_correct_current_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Generate a new password different from the original
  const newPassword = RandomGenerator.alphaNumeric(16);
  // 3. Change password with correct current password
  const passwordChangeResponse =
    await api.functional.ecommerceMall.admin.admin.password.update(
      adminConnection,
      {
        body: {
          currentPassword: originalPassword,
          newPassword: newPassword,
        } satisfies IEcommerceMallAdmin.IPasswordUpdate,
      },
    );
  typia.assert(passwordChangeResponse);
  // 4. Validate success response
  TestValidator.equals(
    "success message present",
    passwordChangeResponse.message !== undefined,
    true,
  );
  TestValidator.predicate(
    "message is non-empty",
    passwordChangeResponse.message.length > 0,
  );
}
