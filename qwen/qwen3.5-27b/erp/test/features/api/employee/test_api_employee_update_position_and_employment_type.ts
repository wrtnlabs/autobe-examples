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
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";

/**
 * Test updating an employee's position and employment type with valid data.
 *
 * Validates the employee update workflow by modifying position and employment type fields. The test ensures that mutable fields are correctly updated while immutable fields remain unchanged, and that the updated_at timestamp is refreshed. All relationship objects (organization, member, department, role) are included in the response.
 *
 * Special attention is given to verifying that the position and employment_type fields are updated to the new values, while immutable fields like id, organization_id, member_id, and created_at remain constant. The updated_at timestamp should be refreshed to reflect the modification time.
 *
 * 1. Authenticate a member account using the join endpoint.
 * 2. Create an employee record with initial position and employment type.
 * 3. Store the original employee data including updated_at timestamp.
 * 4. Update the employee with new position and employment type values.
 * 5. Validate that position and employment_type match the new values.
 * 6. Validate that updated_at timestamp has changed from original.
 * 7. Validate that immutable fields (id, organization, member) remain unchanged.
 * 8. Validate that the response contains all relationship objects.
 */
export async function test_api_employee_update_position_and_employment_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee record
  const originalEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {},
    );
  typia.assert(originalEmployee);
  // 3. Store original data
  const originalPosition = originalEmployee.position;
  const originalEmploymentType = originalEmployee.employment_type;
  const originalUpdatedAt = originalEmployee.updated_at;
  const originalId = originalEmployee.id;
  const originalOrganizationId = originalEmployee.organization.id;
  const originalMemberId = originalEmployee.member.id;
  const originalCreatedAt = originalEmployee.created_at;
  // 4. Prepare update data with new position and employment type
  const newPosition = RandomGenerator.paragraph({ sentences: 2 });
  const employmentTypes: readonly (
    | "full-time"
    | "part-time"
    | "contractor"
    | "intern"
  )[] = ["full-time", "part-time", "contractor", "intern"] as const;
  const newEmploymentType =
    employmentTypes.find((type) => type !== originalEmploymentType) ??
    employmentTypes[0];
  // 5. Update employee
  const updatedEmployee =
    await api.functional.hrmTimeTrack.member.employees.update(
      memberConnection,
      {
        employeeId: originalEmployee.id,
        body: {
          position: newPosition,
          employment_type: newEmploymentType,
        } satisfies IHrmTimeTrackEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee);
  // 6. Validate position updated
  TestValidator.equals(
    "position updated",
    updatedEmployee.position,
    newPosition,
  );
  // 7. Validate employment_type updated
  TestValidator.equals(
    "employment_type updated",
    updatedEmployee.employment_type,
    newEmploymentType,
  );
  // 8. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedEmployee.updated_at,
    originalUpdatedAt,
  );
  // 9. Validate immutable fields unchanged
  TestValidator.equals("id unchanged", updatedEmployee.id, originalId);
  TestValidator.equals(
    "organization_id unchanged",
    updatedEmployee.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "member_id unchanged",
    updatedEmployee.member.id,
    originalMemberId,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedEmployee.created_at,
    originalCreatedAt,
  );
}
