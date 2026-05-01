import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test project member listing with soft-deleted member inclusion control.
 *
 * Validates that the project member list endpoint correctly handles the
 * includeDeleted flag when a member has been removed from a project (soft-deleted).
 * The test verifies that removed members are excluded by default and only appear
 * when explicitly requested, ensuring administrators can audit historical
 * memberships while keeping active views clean.
 *
 * 1. Authenticate as a new member via join.
 * 2. Create a project for membership testing.
 * 3. Invite an employee to the organization.
 * 4. Assign the employee to the project as a member.
 * 5. Remove the employee from the project (soft-delete).
 * 6. List with includeDeleted omitted — removed member absent.
 * 7. List with includeDeleted=true — removed member present.
 * 8. Verify historical data (role, joined_at, employee) preserved.
 */
export async function test_api_project_member_list_include_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {});
  typia.assert(auth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Invite an employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Assign the employee to the project
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: { erp_hrm_employee_id: employee.id },
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  // 5. Remove the employee from the project (soft-delete)
  await api.functional.erpHrm.member.projects.members.erase(memberConnection, {
    projectId: project.id,
    employeeId: employee.id,
  });
  // 6. List without includeDeleted — removed member must be absent
  const activeList = await api.functional.erpHrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(activeList);
  TestValidator.predicate(
    "removed member absent when includeDeleted omitted",
    !ArrayUtil.has(activeList.data, (m) => m.employee.id === employee.id),
  );
  // 7. List with includeDeleted=true — removed member must be present
  const allList = await api.functional.erpHrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        includeDeleted: true,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(allList);
  const deletedMember = allList.data.find((m) => m.employee.id === employee.id);
  TestValidator.predicate(
    "removed member present when includeDeleted is true",
    deletedMember !== undefined,
  );
  typia.assertGuard(deletedMember!);
  // 8. Verify historical data preserved
  TestValidator.equals(
    "membership id preserved",
    deletedMember.id,
    membership.id,
  );
  TestValidator.equals("role preserved", deletedMember.role, membership.role);
  TestValidator.equals(
    "joined_at preserved",
    deletedMember.joined_at,
    membership.joined_at,
  );
  TestValidator.equals(
    "employee id preserved",
    deletedMember.employee.id,
    employee.id,
  );
}
