import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_failure_pending_verification(
  connection: api.IConnection,
) {
  // Create a new admin account with 'pending_verification' status
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();

  const pendingAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role: "full_admin" as const,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(pendingAdmin);

  // Verify account was created with pending_verification status
  TestValidator.equals(
    "admin account status should be pending_verification",
    pendingAdmin.status,
    "pending_verification",
  );

  // Attempt to login with the pending_verification account using correct plain text password
  // This should fail due to business logic (status is pending_verification, not active)
  await TestValidator.error(
    "login should fail for pending_verification admin",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password_hash: password,
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
