import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can successfully retrieve detailed information
 * for another administrator account.
 *
 * Validates the super admin's ability to view complete administrator profiles.
 * The retrieved information includes id, email, name, created_at, and updated_at
 * fields. Critically, password_hash must NOT be included in the response for
 * security reasons. The deleted_at field should be null for active accounts.
 *
 * 1. Create a regular admin account via admin join.
 * 2. Authenticate as super administrator.
 * 3. Call the admin retrieval endpoint with the regular admin's UUID.
 * 4. Validate response contains required fields and excludes password_hash.
 */
export async function test_api_admin_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  // 2. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 3. Retrieve the admin details using the super admin's credentials
  const admin = await api.functional.ecommerceMall.superAdmin.admin.admins.at(
    superAdminConnection,
    {
      adminId: adminAuthorized.id,
    },
  );
  // 4. Validate response
  typia.assert(admin);
  // Verify retrieved admin matches the created admin
  TestValidator.equals("admin id matches", admin.id, adminAuthorized.id);
  TestValidator.equals("email matches", admin.email, adminAuthorized.email);
  TestValidator.equals("name matches", admin.name, adminAuthorized.name);
  // Verify timestamp fields exist
  TestValidator.predicate(
    "has created_at",
    (admin.created_at?.length ?? 0) > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    (admin.updated_at?.length ?? 0) > 0,
  );
  // Security: password_hash must NOT be in response
  TestValidator.predicate(
    "password_hash not exposed",
    !("password_hash" in admin) || admin.password_hash === undefined,
  );
  // Active account check: deleted_at should be null
  TestValidator.equals(
    "deleted_at is null for active account",
    admin.deleted_at,
    null,
  );
}
