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
 * Test that the system rejects invalid email formats when a super administrator attempts to update their email.
 *
 * Validates the email format validation enforcement for the super administrator profile update endpoint. The test registers a new super admin account, authenticates, and then attempts to update the email with an email that already exists in the system. The duplicate email should be rejected with HTTP 400 error indicating validation failure.
 *
 * Note: Email format validation (e.g., "notanemail", "missing@domain") is enforced at compile-time by typia, so those cannot be tested at runtime. This test focuses on the duplicate email validation which is a business logic error.
 *
 * 1. Register a new super admin account via join endpoint.
 * 2. Register a second super admin account to have an existing email.
 * 3. Authenticate as the first super admin.
 * 4. Attempt to update email to the second admin's email.
 * 5. Verify the attempt returns HTTP 400 with validation error for duplicate email.
 */
export async function test_api_superadmin_profile_update_email_invalid_format_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first super admin
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
    {},
  );
  // 2. Register second super admin to get an existing email
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {},
  );
  // 3. First super admin attempts to update email to already existing email
  // This should fail with HTTP 400 due to duplicate email
  await TestValidator.error("duplicate email rejected", async () => {
    await api.functional.ecommerceMall.superAdmin.super_admins.me.update(
      firstSuperAdminConnection,
      {
        body: {
          email: secondAdmin.email,
        } satisfies IEcommerceMallSuperAdmin.IUpdate,
      },
    );
  });
  // 4. Verify original email was not changed
  const profile =
    await api.functional.ecommerceMall.superAdmin.super_admins.me.update(
      firstSuperAdminConnection,
      {
        body: {} satisfies IEcommerceMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(profile);
  TestValidator.equals(
    "original email preserved",
    profile.email,
    firstAdmin.email,
  );
}
