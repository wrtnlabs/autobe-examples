import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin password reset token verification when the token has expired.
 * Scenario:
 * 1. Create an admin account.
 * 2. Request a password reset token.
 * 3. Attempt to verify an invalid/expired token (use random non-existent UUID).
 * 4. Validate that the system properly detects invalid/expired tokens and returns appropriate error response (404).
 */
export async function test_api_admin_password_resets_expired_token_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Request password reset token for the admin
  const resetRequest =
    await api.functional.multiUserTodo.admin.admins.password_resets.request(
      adminConnection,
      {
        body: {
          email: admin.email,
        } satisfies IMultiUserTodoAdminPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);
  // 3. Attempt to verify with an explicitly invalid (non-existent) token UUID
  // This simulates expired token scenario since we cannot manipulate server time
  const invalidTokenId = typia.random<string & tags.Format<"uuid">>();
  // 4. Validate that expired/invalid token verification returns 404 error
  await TestValidator.httpError(
    "expired/invalid token verification",
    404,
    async () => {
      await api.functional.multiUserTodo.admin.admins.password_resets.at(
        { host: connection.host }, // Use unauthenticated connection for public endpoint
        {
          resetTokenId: invalidTokenId,
        },
      );
    },
  );
  // Additional validation: Verify that the valid token can be retrieved successfully
  const validToken =
    await api.functional.multiUserTodo.admin.admins.password_resets.at(
      { host: connection.host },
      {
        resetTokenId: resetRequest.id,
      },
    );
  typia.assert(validToken);
  TestValidator.equals("token ID matches", validToken.id, resetRequest.id);
  TestValidator.equals("admin ID matches", validToken.admin.id, admin.id);
  TestValidator.predicate("expires_at is valid date-time", () => {
    const date = new Date(validToken.expires_at);
    return !isNaN(date.getTime());
  });
}
