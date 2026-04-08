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
 * Test adding permissions to a role where some permissions already exist, validating idempotent behavior.
 *
 * Validates that the permission addition endpoint gracefully handles duplicate permission codes in the request and permissions that are already assigned to the role. The operation should succeed without error and the response should contain the role with all unique permissions, with duplicates ignored.
 *
 * Special attention is given to verifying that:
 * - The operation succeeds despite duplicate permission codes in the request
 * - The response contains the role with all unique permissions without duplicates
 * - The duplicate permission was gracefully ignored and not added twice
 *
 * 1. Authenticate as a member using the join endpoint.
 * 2. Create a custom role with initial permissions (employee_viewing, project_viewing).
 * 3. Add a mix of new permissions (time_management) and duplicate permissions (employee_viewing which already exists).
 * 4. Verify the operation succeeds without error.
 * 5. Confirm the response contains the role with all unique permissions (employee_viewing, project_viewing, time_management) without duplicates.
 * 6. Validate that the duplicate permission was gracefully ignored and not added twice.
 */
export async function test_api_role_permission_addition_with_duplicates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a custom role with initial permissions
  const role = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee_viewing", "project_viewing"],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(role);
  // Verify initial permissions
  TestValidator.equals("initial permissions count", role.permissions.length, 2);
  TestValidator.equals(
    "has employee_viewing",
    role.permissions.includes("employee_viewing"),
    true,
  );
  TestValidator.equals(
    "has project_viewing",
    role.permissions.includes("project_viewing"),
    true,
  );
  // 3. Add permissions including duplicates
  const updatedRole =
    await api.functional.hrmTimeTrack.member.roles.permissions.addPermissions(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissions: ["time_management", "employee_viewing"],
        } satisfies IHrmTimeTrackRole.IAddPermission,
      },
    );
  typia.assert(updatedRole);
  // 4. Verify operation succeeded
  TestValidator.predicate("role updated successfully", updatedRole !== null);
  // 5. Validate response contains all unique permissions without duplicates
  TestValidator.equals(
    "final permissions count",
    updatedRole.permissions.length,
    3,
  );
  TestValidator.equals(
    "has employee_viewing",
    updatedRole.permissions.includes("employee_viewing"),
    true,
  );
  TestValidator.equals(
    "has project_viewing",
    updatedRole.permissions.includes("project_viewing"),
    true,
  );
  TestValidator.equals(
    "has time_management",
    updatedRole.permissions.includes("time_management"),
    true,
  );
  // 6. Validate duplicate was ignored (employee_viewing appears only once)
  const employeeViewingCount = updatedRole.permissions.filter(
    (p) => p === "employee_viewing",
  ).length;
  TestValidator.equals(
    "employee_viewing appears only once",
    employeeViewingCount,
    1,
  );
}
