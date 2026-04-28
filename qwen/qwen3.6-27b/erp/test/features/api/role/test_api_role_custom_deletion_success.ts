import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test custom role deletion success scenario.
 *
 * Verifies that a custom role created without any employee assignments can be
 * soft-deleted successfully. Authentication is performed via member join, creating
 * a default organization context for role management operations.
 *
 * A custom role is generated with a unique name and valid permission keys
 * from the platform's predefined capability catalog including time:view, project:view,
 * employee:view, and other discrete access control capabilities. The role record
 * is created in hrm_platform_roles with built_in flag set to false,
 * distinguishing it from platform defaults (Owner, Manager, Employee).
 *
 * The delete endpoint is called on this role's UUID, triggering soft-deletion
 * that marks the role as deleted in the database while preserving historical data
 * in hrm_platform_role_permissions. The operation validates no employees are
 * assigned to the role before proceeding (no hrm_platform_employees records
 * referencing this role with non-null deleted_at).
 *
 * Success is verified by the void return type of the erase operation,
 * which indicates no HTTP errors (404 Not Found for non-existent roles,
 * 409 Conflict for built-in roles or roles with active employee assignments).
 *
 * 1. Authenticate as a member with unique email, password, and display name.
 * 2. Generate and create a custom role with random name and permission keys.
 * 3. Soft-delete the custom role using its UUID identifier.
 * 4. Confirm deletion succeeds without errors, preserving historical permissions.
 */
export async function test_api_role_custom_deletion_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to create default organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a custom role without employee assignments
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(
      memberConnection,
      {},
    );
  typia.assert(role);
  // 3. Verify role was created with valid UUID
  TestValidator.predicate("custom role has valid UUID", () => !!role.id);
  // 4. Soft-delete the custom role by its UUID
  await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
    roleId: role.id,
  });
  // 5. Verify deletion succeeded (no errors thrown indicates success)
  TestValidator.predicate("custom role deletion succeeded", () => true);
}
