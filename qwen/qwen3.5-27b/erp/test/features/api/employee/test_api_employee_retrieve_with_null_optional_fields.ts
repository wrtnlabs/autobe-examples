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
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test retrieving an employee record where optional fields (department and role) are not assigned.
 *
 * Validates that the system correctly handles employee records with null values for optional organizational assignments. The employee should be active and fully accessible despite missing department and role relationships. This test ensures nullable relationships are handled gracefully without errors.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Organization is created to serve as the employee's parent entity.
 * 3. Employee is created without department or role assignment (both fields omitted).
 * 4. Employee record is retrieved by ID using the retrieval endpoint.
 * 5. Response is validated to confirm department and role are null, while all required fields are present and valid.
 */
export async function test_api_employee_retrieve_with_null_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - capture the authorized member info
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection);
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee without department or role assignment
  // Use the authenticated member's ID, omit department and role fields
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authorized.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Retrieve employee by ID
  const retrieved = await api.functional.hrmTimeTrack.member.employees.at(
    memberConnection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate that optional fields are null
  TestValidator.equals("department is null", retrieved.department, null);
  TestValidator.equals("role is null", retrieved.role, null);
  // Validate required fields are present
  TestValidator.predicate("has valid position", retrieved.position.length > 0);
  TestValidator.predicate(
    "has valid employment type",
    ["full-time", "part-time", "contractor", "intern"].includes(
      retrieved.employment_type,
    ),
  );
  TestValidator.predicate(
    "has valid status",
    ["active", "deactivated"].includes(retrieved.status),
  );
  TestValidator.predicate(
    "has valid hire date",
    retrieved.hire_date.length > 0,
  );
  TestValidator.predicate(
    "has organization reference",
    retrieved.organization.id.length > 0,
  );
  TestValidator.predicate(
    "has member reference",
    retrieved.member.id.length > 0,
  );
}
