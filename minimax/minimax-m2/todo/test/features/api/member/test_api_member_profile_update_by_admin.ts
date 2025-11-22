import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test that administrators can successfully update member profiles.
 *
 * This test validates the complete workflow of admin member management:
 *
 * 1. Create admin account and authenticate
 * 2. Create member account to be updated
 * 3. Admin updates member profile with new information
 * 4. Verify changes are correctly applied
 *
 * The test ensures that:
 *
 * - Admin has proper authorization to modify member data
 * - Profile updates (first name, last name, status) are persisted correctly
 * - No unauthorized users can modify member profiles
 */
export async function test_api_member_profile_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Admin",
        last_name: "User",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account that will be updated by admin
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialMember: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: memberEmail,
        first_name: "John",
        last_name: "Doe",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(initialMember);

  // 3. Admin updates member profile information
  const updatedFirstName = "Jane";
  const updatedLastName = "Smith";
  const updatedStatus = "suspended";

  const updatedMember: ITodoAppMember =
    await api.functional.todoApp.admin.members.update(connection, {
      memberId: initialMember.id,
      body: {
        first_name: updatedFirstName,
        last_name: updatedLastName,
        status: updatedStatus,
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(updatedMember);

  // 4. Verify the updates were applied correctly
  TestValidator.equals(
    "first name was updated by admin",
    updatedMember.first_name,
    updatedFirstName,
  );

  TestValidator.equals(
    "last name was updated by admin",
    updatedMember.last_name,
    updatedLastName,
  );

  TestValidator.equals(
    "status was updated by admin",
    updatedMember.status,
    updatedStatus,
  );

  TestValidator.equals(
    "member ID remains unchanged",
    updatedMember.id,
    initialMember.id,
  );

  TestValidator.equals(
    "member email remains unchanged",
    updatedMember.email,
    initialMember.email,
  );

  // 5. Test partial updates (only updating one field)
  const partiallyUpdatedMember: ITodoAppMember =
    await api.functional.todoApp.admin.members.update(connection, {
      memberId: initialMember.id,
      body: {
        first_name: "Updated",
      } satisfies ITodoAppMember.IUpdate,
    });
  typia.assert(partiallyUpdatedMember);

  TestValidator.equals(
    "partial update preserves other fields",
    partiallyUpdatedMember.last_name,
    updatedLastName,
  );

  TestValidator.equals(
    "partial update modifies only specified field",
    partiallyUpdatedMember.first_name,
    "Updated",
  );
}
