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
 * Test that admin remains logged in after successful password change.
 *
 * Validates the password change operation preserves the administrator session. When an administrator successfully changes their password by providing the correct current password and a new password, the system should update the credentials while maintaining the existing session. The administrator should remain authenticated and be able to make subsequent API requests without requiring re-login.
 *
 * **Test Flow:**
 *
 * 1. Register a new administrator account with unique email and password credentials.
 * 2. Store the authentication token and password for verification.
 * 3. Change the administrator password using the current password and a new secure password.
 * 4. Validate the password change response indicates successful completion.
 * 5. Verify the session remains valid by making another authenticated request.
 * 6. Confirm the administrator remains logged in after password change.
 *
 * **Security Validation:**
 *
 * - Current password must be verified before allowing password change
 * - New password must meet minimum security requirements (8+ characters)
 * - Session token should not be invalidated after password change
 * - Subsequent authenticated requests should succeed without re-authentication
 */
export async function test_api_admin_password_change_remaining_logged_in(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account with explicit password
  const adminConnection: api.IConnection = { host: connection.host };
  const originalPassword = RandomGenerator.alphaNumeric(16) + "A1!";
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      password: originalPassword,
    },
  });
  typia.assert(authorized);
  // Generate new password for change
  const newPassword = RandomGenerator.alphaNumeric(16) + "B2@";
  // 2. Change password with correct current password and new password
  const passwordChangeResult =
    await api.functional.ecommerceMall.admin.admin.password.update(
      adminConnection,
      {
        body: {
          currentPassword: originalPassword,
          newPassword: newPassword,
        } satisfies IEcommerceMallAdmin.IPasswordUpdate,
      },
    );
  typia.assert(passwordChangeResult);
  // 3. Validate password change response
  TestValidator.predicate(
    "password change response has success message",
    passwordChangeResult.message !== null &&
      passwordChangeResult.message.length > 0,
  );
  // 4. Verify session remains valid by making another authenticated request
  // Change password again to confirm the session is still active
  const secondPasswordChangeResult =
    await api.functional.ecommerceMall.admin.admin.password.update(
      adminConnection,
      {
        body: {
          currentPassword: newPassword,
          newPassword: RandomGenerator.alphaNumeric(16) + "C3#",
        } satisfies IEcommerceMallAdmin.IPasswordUpdate,
      },
    );
  typia.assert(secondPasswordChangeResult);
  // 5. Validate second password change succeeded (session was valid)
  TestValidator.predicate(
    "second password change succeeded - session remains valid",
    secondPasswordChangeResult.message !== null &&
      secondPasswordChangeResult.message.length > 0,
  );
}
