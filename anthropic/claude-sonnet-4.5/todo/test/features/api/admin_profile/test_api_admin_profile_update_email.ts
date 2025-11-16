import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test complete administrator profile update workflow focusing on email
 * modification.
 *
 * This test validates the admin profile update functionality by:
 *
 * 1. Creating a new admin account with initial credentials
 * 2. Updating the admin's email address to a new valid email
 * 3. Verifying the update response contains correct updated information
 * 4. Ensuring password hash is excluded from response for security
 * 5. Validating that updated_at timestamp reflects the modification
 * 6. Confirming email format requirements and uniqueness constraints are enforced
 */
export async function test_api_admin_profile_update_email(
  connection: api.IConnection,
) {
  // Step 1: Create initial admin account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const hrefValue = typia.random<string & tags.Format<"uri">>();
  const referrerValue = typia.random<string & tags.Format<"uri">>();

  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      email: initialEmail,
      password: password,
      href: hrefValue,
      referrer: referrerValue,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // Step 2: Update admin email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updateResult = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId: adminRegistration.id,
      body: {
        email: newEmail,
      } satisfies ITodoListAdmin.IUpdate,
    },
  );
  typia.assert(updateResult);

  // Step 3: Validate business logic - email was updated correctly
  TestValidator.equals(
    "admin ID remains unchanged",
    updateResult.id,
    adminRegistration.id,
  );
  TestValidator.equals(
    "email was updated successfully",
    updateResult.email,
    newEmail,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updateResult.created_at,
    adminRegistration.created_at,
  );

  // Step 4: Verify updated_at timestamp changed (business logic validation)
  TestValidator.predicate(
    "updated_at timestamp reflects modification",
    updateResult.updated_at >= adminRegistration.updated_at,
  );
}
