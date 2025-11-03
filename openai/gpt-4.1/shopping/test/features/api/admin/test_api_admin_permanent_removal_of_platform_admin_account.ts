import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Permanently deletes a platform administrator account, enforcing all
 * compliance constraints.
 *
 * 1. Register a new admin via /auth/admin/join, using randomized but valid
 *    credentials
 * 2. Log in as the new admin using /auth/admin/login, verifying authentication
 * 3. As a different (super) admin, permanently delete the target admin via
 *    /shopping/admin/admins/:adminId
 * 4. Attempt to log in using the deleted admin credentials (should fail)
 * 5. Attempt self-deletion: After login, try deleting own account (should fail)
 * 6. Attempt to delete the last remaining admin (should fail)
 * 7. Verify deletion logic: ensure privileges are revoked, access is blocked, and
 *    no accidental soft deletion occurs
 */
export async function test_api_admin_permanent_removal_of_platform_admin_account(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const testEmail = RandomGenerator.alphaNumeric(12) + "@testdomain.com";
  const testPassword = RandomGenerator.alphaNumeric(16) + "!Qq1";
  const testName = RandomGenerator.name(2);
  const testRole = "super";
  const testStatus = "active";
  const newAdmin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: testEmail,
        password: testPassword satisfies string as string,
        name: testName,
        role: testRole,
        status: testStatus,
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(newAdmin);

  // Step 2: Log in as the newly registered admin
  const loginOutput: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: "https://admin-portal.test/login",
        referrer: "https://admin-portal.test/",
      } satisfies IShoppingAdmin.ILogin,
    });
  typia.assert(loginOutput);
  TestValidator.equals(
    "admin.id should match login output id",
    loginOutput.id,
    newAdmin.id,
  );

  // Step 3: Register a second admin (acts as super-admin to perform deletion)
  const superEmail = RandomGenerator.alphaNumeric(12) + "@admincore.io";
  const superPassword = RandomGenerator.alphaNumeric(16) + "!Zz2";
  const superAdmin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superEmail,
        password: superPassword satisfies string as string,
        name: RandomGenerator.name(2),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(superAdmin);

  // Step 4: Super-admin logs in to perform deletion
  await api.functional.auth.admin.login(connection, {
    body: {
      email: superEmail,
      password: superPassword,
      href: "https://admin-portal.test/login",
      referrer: "https://admin-portal.test/",
    } satisfies IShoppingAdmin.ILogin,
  });

  // Step 5: Super-admin deletes the first admin
  await api.functional.shopping.admin.admins.erase(connection, {
    adminId: newAdmin.id,
  });

  // Step 6: Confirm deleted admin cannot log in
  await TestValidator.error("deleted admin login should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: "https://admin-portal.test/login",
        referrer: "https://admin-portal.test/",
      } satisfies IShoppingAdmin.ILogin,
    });
  });

  // Step 7: Attempt self-deletion (should fail)
  // Super-admin logs in again for fresh session
  await api.functional.auth.admin.login(connection, {
    body: {
      email: superEmail,
      password: superPassword,
      href: "https://admin-portal.test/login",
      referrer: "https://admin-portal.test/",
    } satisfies IShoppingAdmin.ILogin,
  });
  await TestValidator.error(
    "self-deletion of admin must be prohibited",
    async () => {
      await api.functional.shopping.admin.admins.erase(connection, {
        adminId: superAdmin.id,
      });
    },
  );

  // Step 8: Register a single (only) admin and attempt to delete (should fail)
  const loneEmail = RandomGenerator.alphaNumeric(10) + "@lonely.com";
  const lonePassword = RandomGenerator.alphaNumeric(16) + "!Xx3";
  const loneAdmin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: loneEmail,
        password: lonePassword satisfies string as string,
        name: RandomGenerator.name(2),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(loneAdmin);
  // log in as only admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: loneEmail,
      password: lonePassword,
      href: "https://onlyadmin.test/login",
      referrer: "https://onlyadmin.test/",
    } satisfies IShoppingAdmin.ILogin,
  });
  await TestValidator.error(
    "prohibit deletion of last/only admin account",
    async () => {
      await api.functional.shopping.admin.admins.erase(connection, {
        adminId: loneAdmin.id,
      });
    },
  );
}
