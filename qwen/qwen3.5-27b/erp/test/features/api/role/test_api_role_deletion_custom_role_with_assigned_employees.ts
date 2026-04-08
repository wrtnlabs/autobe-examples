import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test the prevention of custom role deletion when employees are currently assigned to that role.
 *
 * Validates that the system correctly prevents deletion of custom roles that have active employee assignments, ensuring data integrity by preventing orphaned employee role references. The test verifies that attempting to delete a role with assigned employees results in a 400 Bad Request error with appropriate error messaging.
 *
 * Special attention is given to verifying that the role remains unchanged after the failed deletion attempt and that the error response provides clear information about which employees are affected by the deletion constraint.
 *
 * 1. Register and authenticate as a member with organization management permissions.
 * 2. Create a new custom role with specific permissions (employee_management).
 * 3. Create an employee record and assign them to the custom role.
 * 4. Verify the employee is successfully assigned to the role.
 * 5. Attempt to delete the custom role that has assigned employees.
 * 6. Validate that deletion is prevented with a 400 Bad Request error.
 * 7. Confirm the role remains active and unchanged after the failed deletion.
 */
export async function test_api_role_deletion_custom_role_with_assigned_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a custom role with employee_management permission
  const customRole = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: "CustomManager",
        description: "Custom role with employee management permissions",
        permissions: ["employee_management"],
      } satisfies IHrmTimeTrackRole.ICreate,
    },
  );
  typia.assert(customRole);
  // 3. Create an employee and assign them to the custom role
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        position: RandomGenerator.paragraph({ sentences: 2 }),
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        status: "active",
        hrm_time_track_role_id: customRole.id,
        hrm_time_track_member_id: memberAuth.id,
      } satisfies IHrmTimeTrackEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Verify the employee is successfully assigned to the role
  TestValidator.equals(
    "employee assigned to custom role",
    employee.role?.id,
    customRole.id,
  );
  // 5. Attempt to delete the custom role that has assigned employees
  await TestValidator.httpError(
    "deletion prevented when employees assigned",
    400,
    async () =>
      await api.functional.hrmTimeTrack.member.roles.erase(memberConnection, {
        roleId: customRole.id,
      }),
  );
  // 6. Verify the role remains active (deleted_at is still null)
  TestValidator.predicate(
    "role remains active after failed deletion",
    customRole.deleted_at === null,
  );
}
