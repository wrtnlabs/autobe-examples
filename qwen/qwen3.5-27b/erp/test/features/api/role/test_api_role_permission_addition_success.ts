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
 * Test adding new permissions to an existing custom role successfully.
 *
 * Validates the complete workflow of extending a role's capabilities by adding permissions to an existing custom role. The test authenticates as a member, creates a custom role with initial permissions, adds additional permissions to that role, and verifies that the response contains the complete updated role with all permissions merged correctly.
 *
 * Special attention is given to verifying that:
 * - The initial permissions are preserved when adding new ones
 * - The response contains the complete role object with all permissions
 * - The permissions array correctly includes both original and newly added permissions
 *
 * 1. Authenticate as a member using authorize_member_join utility function.
 * 2. Create a custom role with initial permission (employee_viewing).
 * 3. Add new permissions (project_management, time_viewing_all) to the role.
 * 4. Validate the response contains the complete role with all three permissions.
 */
export async function test_api_role_permission_addition_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a custom role with initial permissions
  const initialPermissions = ["employee_viewing"];
  const role = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: initialPermissions,
      },
    },
  );
  typia.assert(role);
  // 3. Add new permissions to the role
  const newPermissions = {
    permissions: ["project_management", "time_viewing_all"],
  } satisfies IHrmTimeTrackRole.IAddPermission;
  const updatedRole =
    await api.functional.hrmTimeTrack.member.roles.permissions.addPermissions(
      memberConnection,
      {
        roleId: role.id,
        body: newPermissions,
      },
    );
  typia.assert(updatedRole);
  // 4. Validate the role contains all expected permissions
  TestValidator.equals("role ID matches", updatedRole.id, role.id);
  TestValidator.equals("role name preserved", updatedRole.name, role.name);
  TestValidator.predicate(
    "permissions array contains employee_viewing",
    updatedRole.permissions.includes("employee_viewing"),
  );
  TestValidator.predicate(
    "permissions array contains project_management",
    updatedRole.permissions.includes("project_management"),
  );
  TestValidator.predicate(
    "permissions array contains time_viewing_all",
    updatedRole.permissions.includes("time_viewing_all"),
  );
  TestValidator.equals(
    "permissions count is 3",
    updatedRole.permissions.length,
    3,
  );
}