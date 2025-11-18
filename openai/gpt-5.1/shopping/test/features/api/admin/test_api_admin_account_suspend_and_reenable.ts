import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";

/**
 * Validate admin account suspension and re-enabling lifecycle.
 *
 * Business flow:
 *
 * 1. Register Admin A via POST /auth/admin/join and obtain an authorized context.
 * 2. Register Admin B via POST /auth/admin/join, capturing its id, email, and
 *    password.
 * 3. Log back in as Admin A via POST /auth/admin/login so subsequent privileged
 *    operations run under Admin A.
 * 4. As Admin A, call PUT /shoppingMall/admin/admins/{adminId} targeting Admin B
 *    with IShoppingMallAdmin.IUpdate to set status to "suspended" and verify:
 *
 *    - The returned admin id matches Admin B.
 *    - The email is unchanged.
 *    - The status is "suspended".
 *    - Updated_at has advanced from the original value.
 * 5. Attempt to log in as Admin B via POST /auth/admin/login and assert that the
 *    call fails using TestValidator.error, reflecting that suspended admins
 *    cannot authenticate.
 * 6. As Admin A, call the same update endpoint again, setting status back to
 *    "active" and verify the returned admin reflects the new status with the
 *    same id and email.
 * 7. Log in as Admin B again via POST /auth/admin/login and assert success,
 *    verifying that the authorized payload has the correct id, email, and
 *    status="active".
 */
export async function test_api_admin_account_suspend_and_reenable(
  connection: api.IConnection,
) {
  // 1. Register Admin A via join to get initial authorized admin context
  const adminAJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  const adminAEmail = adminAAuth.email;
  const adminAPassword = adminAJoinBody.password;

  // 2. Register Admin B via join and capture its identity and credentials
  const adminBJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  const adminBId = adminBAuth.id;
  const adminBEmail = adminBAuth.email;
  const adminBPassword = adminBJoinBody.password;
  const adminBOriginalUpdatedAt = adminBAuth.updated_at;

  // 3. Ensure connection is authenticated as Admin A again for privileged update
  const adminALoginBody: IShoppingMallAdminLogin.ICreate = {
    email: adminAEmail,
    password: adminAPassword,
    ip: adminAJoinBody.ip,
    href: adminAJoinBody.href,
    referrer: adminAJoinBody.referrer,
  };
  const adminALoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALoginAuth);
  TestValidator.equals(
    "admin A login returns same id",
    adminALoginAuth.id,
    adminAAuth.id,
  );

  // 4. As Admin A, suspend Admin B using update endpoint
  const suspendBody = {
    status: "suspended",
  } satisfies IShoppingMallAdmin.IUpdate;
  const suspendedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: adminBId,
      body: suspendBody,
    });
  typia.assert(suspendedAdmin);

  TestValidator.equals(
    "suspended admin id should match Admin B id",
    suspendedAdmin.id,
    adminBId,
  );
  TestValidator.equals(
    "suspended admin email should remain unchanged",
    suspendedAdmin.email,
    adminBEmail,
  );
  TestValidator.equals(
    "suspended admin status should be 'suspended'",
    suspendedAdmin.status,
    "suspended",
  );
  TestValidator.notEquals(
    "updated_at should advance after suspension",
    suspendedAdmin.updated_at,
    adminBOriginalUpdatedAt,
  );

  // 5. As Admin B, attempt login and expect failure due to suspended status
  const adminBLoginBody: IShoppingMallAdminLogin.ICreate = {
    email: adminBEmail,
    password: adminBPassword,
    ip: adminBJoinBody.ip,
    href: adminBJoinBody.href,
    referrer: adminBJoinBody.referrer,
  };

  await TestValidator.error("suspended admin B login should fail", async () => {
    await api.functional.auth.admin.login(connection, {
      body: adminBLoginBody,
    });
  });

  // 6. As Admin A, re-enable Admin B by setting status back to 'active'
  const reactivateBody = {
    status: "active",
  } satisfies IShoppingMallAdmin.IUpdate;
  const reactivatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: adminBId,
      body: reactivateBody,
    });
  typia.assert(reactivatedAdmin);

  TestValidator.equals(
    "reactivated admin id should still match Admin B id",
    reactivatedAdmin.id,
    adminBId,
  );
  TestValidator.equals(
    "reactivated admin email should remain unchanged",
    reactivatedAdmin.email,
    adminBEmail,
  );
  TestValidator.equals(
    "reactivated admin status should be 'active'",
    reactivatedAdmin.status,
    "active",
  );

  // 7. Now Admin B login should succeed when status is active
  const adminBLoginAfterReactivate: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBLoginAfterReactivate);

  TestValidator.equals(
    "admin B authorized id should match Admin B id after reactivation",
    adminBLoginAfterReactivate.id,
    adminBId,
  );
  TestValidator.equals(
    "admin B authorized email should match",
    adminBLoginAfterReactivate.email,
    adminBEmail,
  );
  TestValidator.equals(
    "admin B status should be 'active' after reactivation",
    adminBLoginAfterReactivate.status,
    "active",
  );
}
