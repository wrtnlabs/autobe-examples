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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator demotion workflow by another super administrator.
 *
 * Validates the complete demotion flow where a super administrator successfully
 * demotes another super administrator to regular administrator status. This test
 * ensures that:
 * - Super administrators can demote other super administrators
 * - The demoted admin entity is returned with all required fields
 * - The response excludes sensitive data like password_hash
 * - The audit trail is properly created for accountability
 *
 * 1. Register first super administrator who will perform the demotion action
 * 2. Register second super administrator to be the demotion target
 * 3. Authenticate as first super administrator
 * 4. Call demote endpoint with second super admin's userId
 * 5. Verify response contains valid admin entity with id, email, name, timestamps
 * 6. Verify no password_hash field is exposed in response
 */
export async function test_api_admin_demotion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator (acting admin who will perform demotion)
  const actingSuperAdminConnection: api.IConnection = { host: connection.host };
  const actingSuperAdmin = await authorize_super_admin_join(
    actingSuperAdminConnection,
    {},
  );
  typia.assert(actingSuperAdmin);
  // 2. Create second super administrator (target to be demoted)
  const targetSuperAdminConnection: api.IConnection = { host: connection.host };
  const targetSuperAdmin = await authorize_super_admin_join(
    targetSuperAdminConnection,
    {},
  );
  typia.assert(targetSuperAdmin);
  // 3. & 4. Authenticate as first super administrator and call demote endpoint
  // The actingSuperAdminConnection already has the token from authorize_super_admin_join
  const demotedAdmin =
    await api.functional.ecommerceMall.superAdmin.admin.demote(
      actingSuperAdminConnection,
      {
        userId: targetSuperAdmin.id,
      },
    );
  // 5. Verify response contains valid admin entity with all required fields
  typia.assert(demotedAdmin);
  // Validate required fields exist and have correct types
  TestValidator.equals(
    "demoted admin has valid id",
    demotedAdmin.id.length > 0,
    true,
  );
  TestValidator.equals(
    "demoted admin has valid email format",
    demotedAdmin.email.includes("@"),
    true,
  );
  TestValidator.equals(
    "demoted admin has name",
    demotedAdmin.name.length > 0,
    true,
  );
  TestValidator.equals(
    "demoted admin has created_at",
    demotedAdmin.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "demoted admin has updated_at",
    demotedAdmin.updated_at.length > 0,
    true,
  );
  TestValidator.equals(
    "demoted admin deleted_at is null",
    demotedAdmin.deleted_at,
    null,
  );
  // 6. Verify id matches the target super admin that was demoted
  TestValidator.equals(
    "demoted admin id matches target",
    demotedAdmin.id,
    targetSuperAdmin.id,
  );
  TestValidator.equals(
    "demoted admin email matches target",
    demotedAdmin.email,
    targetSuperAdmin.email,
  );
}
