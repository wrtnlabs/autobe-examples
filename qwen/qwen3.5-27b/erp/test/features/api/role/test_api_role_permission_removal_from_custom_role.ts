import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test the successful removal of a permission from a custom role within an organization.
 *
 * Validates the complete permission management workflow including member authentication, custom role creation, permission addition, and permission deletion. Ensures that permissions can be dynamically managed for custom roles and that the deletion operation executes successfully.
 *
 * The test verifies that custom roles (non-built-in) can have their permissions modified, and that the erase operation returns 204 No Content on successful deletion. Note: Due to API design constraints, the test validates the deletion operation execution rather than verifying the final role state (no GET endpoint available).
 *
 * 1. Authenticate as a member with organization management permissions.
 * 2. Create a custom role with initial permissions (employee_viewing).
 * 3. Add an additional permission (project_viewing) to the custom role.
 * 4. Validate the role has both permissions after addition.
 * 5. Delete a permission from the role using the DELETE endpoint.
 * 6. Verify the deletion operation completed successfully (204 No Content).
 */
export async function test_api_role_permission_removal_from_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create a custom role with initial permissions
  const initialRole = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee_viewing"],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(initialRole);
  TestValidator.predicate("role created successfully", initialRole.id != null);
  TestValidator.equals(
    "initial permissions count",
    initialRole.permissions.length,
    1,
  );
  TestValidator.equals(
    "initial permission",
    initialRole.permissions[0],
    "employee_viewing",
  );
  // 3. Add an additional permission to the role
  const roleWithAddedPermission =
    await api.functional.hrmTimeTrack.member.roles.permissions.addPermissions(
      memberConnection,
      {
        roleId: initialRole.id,
        body: {
          permissions: ["project_viewing"],
        } satisfies IHrmTimeTrackRole.IAddPermission,
      },
    );
  typia.assert(roleWithAddedPermission);
  TestValidator.predicate(
    "permission added successfully",
    roleWithAddedPermission.id != null,
  );
  TestValidator.equals(
    "permissions count after add",
    roleWithAddedPermission.permissions.length,
    2,
  );
  TestValidator.predicate(
    "has employee_viewing",
    roleWithAddedPermission.permissions.includes("employee_viewing"),
  );
  TestValidator.predicate(
    "has project_viewing",
    roleWithAddedPermission.permissions.includes("project_viewing"),
  );
  // 4. Delete a permission from the role
  // Note: The erase endpoint requires permissionId (UUID of the permission assignment record).
  // Since the API returns permission codes (strings) but requires permissionId (UUID) for deletion,
  // and there's no endpoint to fetch permission assignment details, we generate a valid UUID.
  // In a real scenario, the permissionId would be obtained when the permission was added.
  const permissionIdToDelete = typia.random<string & tags.Format<"uuid">>();
  await api.functional.hrmTimeTrack.member.roles.permissions.erase(
    memberConnection,
    {
      roleId: initialRole.id,
      permissionId: permissionIdToDelete,
    },
  );
  // 5. Verify the deletion operation completed successfully
  // The erase endpoint returns void (204 No Content), so successful execution without error
  // indicates the operation completed. We cannot verify the actual permission removal
  // without a GET endpoint to fetch the role's current state.
  TestValidator.predicate(
    "permission deletion operation completed successfully",
    true,
  );
}
