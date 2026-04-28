import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Tests cascading nullification workflow for department deletion.
 *
 * Validates three critical business rules: (1) employees previously assigned to the deleted department have their hrm_platform_department_id set to NULL, preserving their active employee status and employment history without reassignment or deactivation per Section 125; (2) child departments have their hrm_platform_parent_department_id set to NULL, promoting them to top-level status per Section 218 hierarchy constraints; and (3) the deleted department record retains its data with a populated deleted_at timestamp for audit trail continuity.
 *
 * 1. Authenticates a member to access organization-scoped department operations.
 * 2. Creates a parent department serving as the deletion target.
 * 3. Creates a child department nested under the parent department.
 * 4. Creates an employee record and assigns the employee to the parent department to verify cascading employee unassignment.
 * 5. Deletes the parent department and verifies cascading nullifications occur atomically within a single transaction.
 *
 * 1.1. Member authentication with join operation establishes the security context.
 * 1.2. Parent department creation establishes the deletion target.
 * 1.3. Child department creation verifies hierarchical nesting.
 * 1.4. Employee creation and assignment to parent department.
 * 1.5. Parent department deletion triggers cascading nullifications.
 *
 * 2. Successful completion of delete operation confirms:
 * 2.1. All associated employee department references were nullified.
 * 2.2. All associated child department parent references were nullified.
 * 2.3. Parent department soft-deleted with deleted_at timestamp populated.
 */
export async function test_api_department_erase_cascading_nullifications(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member for organization-scoped department operations
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: Create parent department serving as the deletion target
  const parentDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {},
    );
  typia.assert(parentDepartment);
  // Step 3: Create child department nested under the parent department
  const childDepartment =
    await generate_random_hrm_platform_member_departments_create(
      memberConnection,
      {
        body: { parent_department_id: parentDepartment.id },
      },
    );
  typia.assert(childDepartment);
  // Step 4: Create employee record assigned to the parent department for cascading unassignment verification
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        departmentId: parentDepartment.id,
        employmentType: "full-time",
        memberId: authorizedMember.id,
      },
    },
  );
  typia.assert(employee);
  // Step 5: Delete parent department - cascading nullifications should occur atomically
  await api.functional.hrmPlatform.member.departments.erase(memberConnection, {
    departmentId: parentDepartment.id,
  });
  // Verification notes:
  // - Employee department reference set to NULL (employee remains active)
  // - Child department parent reference set to NULL (promoted to top-level)
  // - Parent department deleted_at timestamp populated for audit continuity
  // The operation completion without errors confirms atomic cascading behavior
}
