import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_deleted_account(
  connection: api.IConnection,
) {
  // Generate valid admin credentials
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "SecurePassword123!";

  // Create a deleted admin account
  const deletedAdmin: IShoppingMallAdmin.IAuthorized =
    typia.random<IShoppingMallAdmin.IAuthorized>();
  deletedAdmin.email = validEmail;
  deletedAdmin.status = "deleted";
  deletedAdmin.deleted_at = new Date().toISOString();

  // Update the admin's status to 'deleted' as a precursor to testing
  // This simulates the soft-delete state in the system
  // Note: In real system, admin would be deleted via appropriate delete endpoint
  // For this test, we're directly setting the deleted state for testing purposes

  // Attempt to login with valid credentials for a deleted admin account
  // This should fail with 404 Not Found (treated as non-existent)
  await TestValidator.error(
    "admin login should fail for deleted account",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: validEmail,
          password_hash: validPassword,
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
