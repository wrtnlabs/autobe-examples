import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validates privileged admin is able to update another admin's account by UUID.
 *
 * - Creates two admins (admin1 and admin2) via /auth/admin/join.
 * - Authenticates as admin1.
 * - Updates admin2's account using /todoApp/admin/admins/{adminId}:
 *
 *   - Change email
 *   - Rotate password (password_hash)
 *   - Toggle soft delete status (deleted_at)
 * - Verifies only updatable fields are changed, and immutable fields (id,
 *   created_at) remain unchanged.
 * - Ensures updated values are reflected in response.
 * - Attempts to perform forbidden updates (change id, created_at) are not
 *   possible due to DTO schema.
 * - Verifies edge cases:
 *
 *   - Attempting to update non-existent admin returns an error
 *   - Attempting to update already soft-deleted admin returns an error
 *   - Attempting to set duplicated email returns an error due to uniqueness
 *       constraint
 */
export async function test_api_admin_account_update_by_privileged_admin(
  connection: api.IConnection,
) {
  // 1. Create privileged admin (admin1)
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1Password = RandomGenerator.alphaNumeric(12);
  const joinBody1 = {
    email: admin1Email,
    password: admin1Password,
    href: "https://admin1.test/join",
    referrer: "https://admin1.test/landing",
  } satisfies ITodoAppAdmin.IJoin;
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: joinBody1,
  });
  typia.assert(admin1);

  // 2. Create a second admin (admin2)
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Password = RandomGenerator.alphaNumeric(12);
  const joinBody2 = {
    email: admin2Email,
    password: admin2Password,
    href: "https://admin2.test/join",
    referrer: "https://admin2.test/landing",
  } satisfies ITodoAppAdmin.IJoin;
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: joinBody2,
  });
  typia.assert(admin2);

  // 3. Auth context: privileged admin1 (already authenticated)
  // 4. Successful update: Change admin2's email, rotate password, toggle deleted_at
  const newAdmin2Email = typia.random<string & tags.Format<"email">>();
  const newAdmin2PasswordHash = RandomGenerator.alphaNumeric(40); // fake hash
  const updateInput = {
    email: newAdmin2Email,
    password_hash: newAdmin2PasswordHash,
    // leave deleted_at undefined in this pass
  } satisfies ITodoAppAdmin.IUpdate;

  const updatedAdmin2 = await api.functional.todoApp.admin.admins.update(
    connection,
    {
      adminId: admin2.id,
      body: updateInput,
    },
  );
  typia.assert(updatedAdmin2);

  TestValidator.equals(
    "updated email is applied",
    updatedAdmin2.email,
    newAdmin2Email,
  );
  TestValidator.equals(
    "password hash rotated",
    updatedAdmin2.password_hash,
    newAdmin2PasswordHash,
  );
  TestValidator.equals(
    "admin2 id remains unchanged",
    updatedAdmin2.id,
    admin2.id,
  );
  TestValidator.equals(
    "admin2 created_at remains unchanged",
    updatedAdmin2.created_at,
    admin2.created_at,
  );
  TestValidator.equals(
    "admin2 is not soft-deleted after update",
    updatedAdmin2.deleted_at,
    null,
  );

  // 5. Toggle soft delete: set deleted_at
  const softDeleteInput = {
    deleted_at: new Date().toISOString(),
  } satisfies ITodoAppAdmin.IUpdate;
  const softDeletedAdmin2 = await api.functional.todoApp.admin.admins.update(
    connection,
    {
      adminId: admin2.id,
      body: softDeleteInput,
    },
  );
  typia.assert(softDeletedAdmin2);

  TestValidator.equals(
    "soft-deleted flag is set",
    softDeletedAdmin2.deleted_at !== null,
    true,
  );

  // 6. Reactivate (set deleted_at to null)
  const reactivateInput = {
    deleted_at: null,
  } satisfies ITodoAppAdmin.IUpdate;
  const reactivatedAdmin2 = await api.functional.todoApp.admin.admins.update(
    connection,
    {
      adminId: admin2.id,
      body: reactivateInput,
    },
  );
  typia.assert(reactivatedAdmin2);
  TestValidator.equals(
    "soft-deleted flag is cleared after reactivation",
    reactivatedAdmin2.deleted_at,
    null,
  );

  // 7. Attempt to update non-existent admin
  await TestValidator.error("updating non-existent admin fails", async () => {
    await api.functional.todoApp.admin.admins.update(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies ITodoAppAdmin.IUpdate,
    });
  });

  // 8. Attempt to update already soft-deleted admin
  // Soft delete admin2 first
  const deletedInput = {
    deleted_at: new Date().toISOString(),
  } satisfies ITodoAppAdmin.IUpdate;
  const deletedAdmin2 = await api.functional.todoApp.admin.admins.update(
    connection,
    {
      adminId: admin2.id,
      body: deletedInput,
    },
  );
  typia.assert(deletedAdmin2);

  // Now, try to update -- should fail
  await TestValidator.error("updating soft-deleted admin fails", async () => {
    await api.functional.todoApp.admin.admins.update(connection, {
      adminId: admin2.id,
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      } satisfies ITodoAppAdmin.IUpdate,
    });
  });

  // 9. Attempt to change admin2's email to a duplicate (admin1's email)
  // Reactivate admin2 first
  await api.functional.todoApp.admin.admins.update(connection, {
    adminId: admin2.id,
    body: { deleted_at: null } satisfies ITodoAppAdmin.IUpdate,
  });
  await TestValidator.error("duplicate email update fails", async () => {
    await api.functional.todoApp.admin.admins.update(connection, {
      adminId: admin2.id,
      body: { email: admin1Email } satisfies ITodoAppAdmin.IUpdate,
    });
  });
}
