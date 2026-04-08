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
 * Test super administrator email update success scenario.
 *
 * Validates the primary success path for a super administrator updating their own email address. This test ensures that an authenticated super admin can successfully change their email to a new unique value through the self-update endpoint.
 *
 * **Test Flow:**
 * 1. Register a new super admin account with initial email
 * 2. Authenticate and receive JWT token for the newly created account
 * 3. Update the super admin's email to a new unique email address
 * 4. Validate the response contains the updated email while preserving immutable fields
 *
 * **Expected Behaviors:**
 * - Email field is updated to the new unique value
 * - ID remains unchanged (immutable identifier)
 * - created_at timestamp is preserved (immutable)
 * - updated_at is updated to reflect the modification time
 * - deleted_at remains null (account remains active)
 */
export async function test_api_superadmin_profile_update_email_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Generate a new unique email for the update
  const originalEmail = authorized.email;
  const newEmail = typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>();
  // Ensure the new email is different from the original
  TestValidator.notEquals(
    "new email differs from original",
    originalEmail,
    newEmail,
  );
  // 3. Update the super admin's email
  const updatedSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.me.update(
      superAdminConnection,
      {
        body: {
          email: newEmail,
        } satisfies IEcommerceMallSuperAdmin.IUpdate,
      },
    );
  typia.assert(updatedSuperAdmin);
  // 4. Validate business logic
  TestValidator.equals(
    "email updated to new value",
    updatedSuperAdmin.email,
    newEmail,
  );
  TestValidator.equals("id preserved", updatedSuperAdmin.id, authorized.id);
  TestValidator.equals(
    "created_at preserved",
    updatedSuperAdmin.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedSuperAdmin.deleted_at,
    null,
  );
}