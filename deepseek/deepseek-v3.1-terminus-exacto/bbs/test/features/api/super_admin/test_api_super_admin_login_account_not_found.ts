import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
 * Test login failure with non-existent account.
 * Attempt to login with credentials for an account that was never created.
 * Validate that the system properly handles the non-existent account scenario
 * with appropriate error response without revealing whether the account exists or not.
 */
export async function test_api_super_admin_login_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Generate credentials for an account that was never registered
  // Using RandomGenerator utilities since typia is not available in imports
  const loginCredentials = {
    email: `${RandomGenerator.alphabets(8)}@${RandomGenerator.alphabets(5)}.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardSuperAdmin.ILogin;
  // Attempt to login with non-existent credentials using utility function
  await TestValidator.error("login with non-existent account", async () => {
    await authorize_super_admin_login(loginConnection, {
      body: loginCredentials,
    });
  });
}
