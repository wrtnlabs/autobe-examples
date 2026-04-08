import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test that the system prevents duplicate email addresses when a super administrator attempts to update their email to an email already in use by another super admin.
 *
 * Validates the uniqueness constraint enforcement for super admin email updates. This test ensures that the system properly rejects attempts to change an email address to one that is already registered by another super administrator, returning an appropriate HTTP 400 error.
 *
 * The test creates two separate super admin accounts with unique email addresses, authenticates as the first admin, then attempts to update their email to the second admin's existing email address. The system should reject this request with HTTP 400 Bad Request.
 *
 * 1. Register first super admin account with a unique email.
 * 2. Register second super admin account with a different unique email.
 * 3. Authenticate as the first super admin.
 * 4. Attempt to update first admin's email to second admin's existing email.
 * 5. Verify HTTP 400 error is returned with appropriate error message.
 */
export async function test_api_superadmin_profile_update_email_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first super admin account
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstAuth = await authorize_super_admin_join(
    firstSuperAdminConnection,
    {},
  );
  typia.assert(firstAuth);
  const firstEmail = firstAuth.email;
  // 2. Register second super admin account with a different email
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondAuth = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {},
  );
  typia.assert(secondAuth);
  const secondEmail = secondAuth.email;
  // 3. Create authenticated connection for first super admin
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${firstAuth.token.access}`,
  };
  // 4. Attempt to update first super admin's email to second super admin's existing email
  // This should fail with HTTP 400 due to duplicate email constraint
  await TestValidator.httpError("duplicate email rejection", 400, async () => {
    await api.functional.ecommerceMall.superAdmin.super_admins.me.update(
      authenticatedConnection,
      {
        body: {
          email: secondEmail,
        } satisfies IEcommerceMallSuperAdmin.IUpdate,
      },
    );
  });
}
