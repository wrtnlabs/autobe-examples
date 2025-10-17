import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test that password change requires valid administrator authentication.
 *
 * This test validates the security requirement that password change operations
 * must be performed by authenticated administrators only. The test follows this
 * workflow:
 *
 * 1. Create an administrator account to establish a valid target
 * 2. Create an unauthenticated connection by removing authentication headers
 * 3. Attempt to change the password without authentication credentials
 * 4. Verify that the request is rejected with an authentication error
 *
 * This ensures that unauthorized users cannot change administrator passwords
 * even if they know the current password, protecting against session hijacking
 * and unauthorized access scenarios.
 */
export async function test_api_administrator_password_change_unauthenticated_request(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create an unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt to change password without authentication
  const passwordChangeData = {
    current_password: adminData.password,
    new_password: RandomGenerator.alphaNumeric(12),
    new_password_confirm: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.IChangePassword;

  // Step 4: Verify that the request is rejected
  await TestValidator.error(
    "unauthenticated password change should fail",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        unauthConnection,
        {
          body: passwordChangeData,
        },
      );
    },
  );
}
