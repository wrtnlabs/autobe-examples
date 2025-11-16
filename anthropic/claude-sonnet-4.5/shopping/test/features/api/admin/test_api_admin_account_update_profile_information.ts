import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin profile update workflow with complete validation.
 *
 * This test validates that an authenticated administrator can successfully
 * update their profile information (full_name, email, phone_number) and
 * verifies proper data persistence, immutable field protection, and audit trail
 * maintenance.
 *
 * Workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Store original profile for comparison
 * 3. Update profile with new values
 * 4. Validate response reflects changes
 * 5. Verify immutable fields unchanged
 * 6. Confirm audit timestamp updated
 */
export async function test_api_admin_account_update_profile_information(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalFullName = RandomGenerator.name();
  const originalPhone = RandomGenerator.mobile();

  const adminCreateBody = {
    email: originalEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: originalFullName,
    phone_number: originalPhone,
    admin_level: "moderator" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const authenticatedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(authenticatedAdmin);

  // Step 2: Store original values for verification
  const originalId = authenticatedAdmin.id;
  const originalCreatedAt = authenticatedAdmin.created_at;

  // Step 3: Prepare update data with new values
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newFullName = RandomGenerator.name();
  const newPhone = RandomGenerator.mobile();

  const updateBody = {
    email: newEmail,
    full_name: newFullName,
    phone_number: newPhone,
  } satisfies IShoppingMallAdmin.IUpdate;

  // Step 4: Execute profile update
  const updatedAdmin = await api.functional.shoppingMall.admin.admins.update(
    connection,
    {
      adminId: authenticatedAdmin.id,
      body: updateBody,
    },
  );
  typia.assert(updatedAdmin);

  // Step 5: Validate updated fields reflect new values
  TestValidator.equals("updated email matches", updatedAdmin.email, newEmail);
  TestValidator.equals(
    "updated full_name matches",
    updatedAdmin.full_name,
    newFullName,
  );
  TestValidator.equals(
    "updated phone_number matches",
    updatedAdmin.phone_number,
    newPhone,
  );

  // Step 6: Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedAdmin.id, originalId);
  TestValidator.equals(
    "created_at unchanged",
    updatedAdmin.created_at,
    originalCreatedAt,
  );

  // Step 7: Verify updated_at timestamp reflects modification
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedAdmin.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );

  // Step 8: Verify admin_level persisted correctly
  TestValidator.equals(
    "admin_level preserved",
    updatedAdmin.admin_level,
    "moderator",
  );

  // Step 9: Verify email_verified status maintained
  TestValidator.equals(
    "email_verified maintained",
    updatedAdmin.email_verified,
    true,
  );
}
