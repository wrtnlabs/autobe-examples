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
 * Test the successful password reset request flow for an admin account.
 */
export async function test_api_admin_password_reset_request_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);
  // 2. Prepare password reset request with the admin's registered email
  const requestBody = {
    email: adminJoin.email,
  } satisfies IMultiUserTodoAdminPasswordReset.IRequest;
  // 3. Call the password reset endpoint (no authentication required)
  const resetResponse =
    await api.functional.multiUserTodo.admin.admins.password_resets.request(
      connection,
      { body: requestBody },
    );
  typia.assert(resetResponse);
  // 4. Validate response structure and business logic
  // Token ID should be UUID format (validated by typia.assert)
  TestValidator.predicate("token ID exists", !!resetResponse.id);
  // Expiration timestamp should be in the future (token not expired)
  const expiresAt = new Date(resetResponse.expires_at);
  const now = new Date();
  TestValidator.predicate("token expiration in future", expiresAt > now);
  // Token should be unused
  TestValidator.equals("token unused", resetResponse.used_at, null);
  // Admin summary should match the created admin
  TestValidator.equals(
    "admin ID matches",
    resetResponse.admin.id,
    adminJoin.id,
  );
  TestValidator.equals(
    "admin email matches",
    resetResponse.admin.email,
    adminJoin.email,
  );
  TestValidator.equals(
    "admin display name matches",
    resetResponse.admin.display_name,
    adminJoin.display_name,
  );
  // Timestamps should exist
  TestValidator.predicate("created_at exists", !!resetResponse.created_at);
  TestValidator.predicate("updated_at exists", !!resetResponse.updated_at);
  // created_at should be before or equal to updated_at
  const createdAt = new Date(resetResponse.created_at);
  const updatedAt = new Date(resetResponse.updated_at);
  TestValidator.predicate("created_at <= updated_at", createdAt <= updatedAt);
}
