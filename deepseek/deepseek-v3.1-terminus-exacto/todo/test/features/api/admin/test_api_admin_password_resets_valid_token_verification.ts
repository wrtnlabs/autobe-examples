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
 * Test admin password reset token verification workflow where a valid, unused,
 * non-expired token exists.
 *
 * 1. Create a new admin account via the admin join endpoint
 * 2. Create a password reset token for the admin using the request endpoint
 * 3. Verify the token using the GET operation
 * 4. Validate the response includes correct token details:
 *    - id matches
 *    - expires_at is in the future
 *    - used_at is null (not used)
 *    - admin summary correctly references the creator
 */
export async function test_api_admin_password_resets_valid_token_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create password reset token (no authentication required for this endpoint)
  // Create a new connection without admin token for the request endpoint
  const resetRequestConnection: api.IConnection = { host: connection.host };
  const resetRequest =
    await api.functional.multiUserTodo.admin.admins.password_resets.request(
      resetRequestConnection,
      {
        body: {
          email: admin.email,
        } satisfies IMultiUserTodoAdminPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);
  // 3. Verify the token using GET endpoint
  const tokenVerification =
    await api.functional.multiUserTodo.admin.admins.password_resets.at(
      resetRequestConnection,
      {
        resetTokenId: resetRequest.id,
      },
    );
  typia.assert(tokenVerification);
  // 4. Validate token details
  TestValidator.equals(
    "token ID matches",
    tokenVerification.id,
    resetRequest.id,
  );
  // expires_at should be in the future
  const expiresAt = new Date(tokenVerification.expires_at);
  const now = new Date();
  TestValidator.predicate("token not expired", expiresAt > now);
  // used_at should be null (token not used)
  TestValidator.equals("token not used", tokenVerification.used_at, null);
  // admin summary should reference the correct admin
  TestValidator.equals(
    "admin id matches",
    tokenVerification.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "admin email matches",
    tokenVerification.admin.email,
    admin.email,
  );
  TestValidator.equals(
    "admin display name matches",
    tokenVerification.admin.display_name,
    admin.display_name,
  );
  // created_at and updated_at should be valid timestamps
  const createdAt = new Date(tokenVerification.created_at);
  const updatedAt = new Date(tokenVerification.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate("created_at <= updated_at", createdAt <= updatedAt);
}
