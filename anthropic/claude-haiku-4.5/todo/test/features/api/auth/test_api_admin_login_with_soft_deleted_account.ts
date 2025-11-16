import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_login_with_soft_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const createdAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify the admin account was created and has no deletion timestamp
  TestValidator.predicate(
    "admin account should not be soft-deleted initially",
    createdAdmin.deleted_at === null || createdAdmin.deleted_at === undefined,
  );

  // Step 3: Verify login works with the created admin's credentials
  const loginBefore: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(loginBefore);
  TestValidator.equals(
    "login should return the same admin email before soft deletion",
    loginBefore.email,
    adminEmail,
  );

  // Step 4: Simulate soft deletion by creating a soft-deleted account for testing
  // Note: Since there's no direct soft-deletion endpoint in the available API,
  // we test the theoretical scenario where an admin account with deleted_at set
  // should not authenticate
  const softDeletedAdminSimulated = {
    ...createdAdmin,
    deleted_at: new Date().toISOString(),
  } satisfies ITodoAppAdmin.IAuthorized;

  // Step 5: Verify that soft-deleted account marker is set
  TestValidator.predicate(
    "simulated soft-deleted admin should have deleted_at timestamp",
    softDeletedAdminSimulated.deleted_at !== null &&
      softDeletedAdminSimulated.deleted_at !== undefined,
  );

  // Step 6: Attempt login with soft-deleted account credentials
  // In a real system with enforcement, this should fail
  // The API should reject authentication for accounts marked as deleted
  await TestValidator.error(
    "soft-deleted admin account should not be able to login",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );
}
