import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates that administrator profile retrieval includes complete audit trail
 * information.
 *
 * This test ensures that when retrieving an administrator profile, all
 * audit-related timestamps are present and properly formatted for compliance
 * and tracking purposes.
 *
 * Test workflow:
 *
 * 1. Create a new administrator account
 * 2. Retrieve the administrator profile using the profile endpoint
 * 3. Verify all audit timestamps exist through typia.assert() validation
 * 4. Confirm deleted_at is null for active accounts
 * 5. Verify audit information consistency (ID and email matching)
 * 6. Validate business logic: updated_at is not before created_at
 */
export async function test_api_admin_profile_audit_information(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with random credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const hrefValue = typia.random<string & tags.Format<"uri">>();
  const referrerValue = typia.random<string & tags.Format<"uri">>();

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: hrefValue,
        referrer: referrerValue,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Retrieve administrator profile to verify audit trail information
  const adminProfile: ITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.at(connection, {
      adminId: createdAdmin.id,
    });
  typia.assert(adminProfile);

  // Step 3: Verify deleted_at is null for newly created (active) account
  TestValidator.equals(
    "deleted_at should be null for active admin account",
    adminProfile.deleted_at,
    null,
  );

  // Step 4: Verify audit information consistency
  TestValidator.equals(
    "retrieved admin ID matches created admin ID",
    adminProfile.id,
    createdAdmin.id,
  );

  TestValidator.equals(
    "retrieved admin email matches created admin email",
    adminProfile.email,
    createdAdmin.email,
  );

  // Step 5: Validate business logic - updated_at should not be before created_at
  const createdAtDate = new Date(adminProfile.created_at);
  const updatedAtDate = new Date(adminProfile.updated_at);

  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
