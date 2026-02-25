import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
 * Test the session invalidation aspect of password changes.
 * After changing the password, verify that all active sessions are invalidated
 * by attempting to use existing authentication tokens for protected operations.
 * The test should confirm that sessions are properly deleted and that
 * re-authentication with the new password is required for continued access.
 */
export async function test_api_admin_password_change_session_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminCredentials: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    permissions_level: null,
  };
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: adminCredentials,
  });
  typia.assert(admin1);
  // Step 2: Create second active session with same credentials
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_login(adminConnection2, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin2);
  // Step 3: Change password using first connection
  const newPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.communityPlatform.admin.password.updatePassword(
    adminConnection1,
    {
      body: {
        current_password: adminCredentials.password,
        new_password: newPassword,
      } satisfies ICommunityPlatformUser.IChangePassword,
    },
  );
  // Step 4: Verify old sessions are invalidated
  // Attempt to use first connection (which performed password change)
  await TestValidator.error(
    "first connection session should be invalidated",
    async () => {
      await api.functional.communityPlatform.admin.password.updatePassword(
        adminConnection1,
        {
          body: {
            current_password: adminCredentials.password,
            new_password: RandomGenerator.alphaNumeric(16),
          } satisfies ICommunityPlatformUser.IChangePassword,
        },
      );
    },
  );
  // Attempt to use second connection
  await TestValidator.error(
    "second connection session should be invalidated",
    async () => {
      await api.functional.communityPlatform.admin.password.updatePassword(
        adminConnection2,
        {
          body: {
            current_password: adminCredentials.password,
            new_password: RandomGenerator.alphaNumeric(16),
          } satisfies ICommunityPlatformUser.IChangePassword,
        },
      );
    },
  );
  // Step 5: Re-authenticate with new password and verify access
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_login(adminConnection3, {
    body: {
      email: adminCredentials.email,
      password: newPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin3);
  // Verify new session works by performing a password change operation
  const anotherNewPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.communityPlatform.admin.password.updatePassword(
    adminConnection3,
    {
      body: {
        current_password: newPassword,
        new_password: anotherNewPassword,
      } satisfies ICommunityPlatformUser.IChangePassword,
    },
  );
}
