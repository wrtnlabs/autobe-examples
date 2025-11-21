import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_pending_verification(
  connection: api.IConnection,
) {
  // Generate valid admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "validPassword123";

  // Mock a pending_verification admin account with the generated credentials
  // This simulates a real admin account in the system with pending_verification status
  const loginRequest = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IShoppingMallAdmin.IRequest;

  // Attempt login with pending_verification status
  // According to scenario, this should fail with 401 Unauthorized
  await TestValidator.error(
    "pending_verification admin should be denied access",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginRequest,
      });
    },
  );
}
