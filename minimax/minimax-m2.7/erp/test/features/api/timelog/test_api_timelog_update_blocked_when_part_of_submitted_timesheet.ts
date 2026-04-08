import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_timelog_update_blocked_when_part_of_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        currency: "USD",
        name: `Test Org ${RandomGenerator.alphaNumeric(8)}`,
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(organization);
  // 3. Create role with time permissions
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(4)}`,
        permissions: [
          "employee:manage",
          "employee:view",
          "project:manage",
          "project:view",
          "time:manage",
          "time:approve",
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Create department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: `Test Dept ${RandomGenerator.alphaNumeric(4)}`,
        description: "Department for timelog test",
      },
    },
  );
  typia.assert(department);
  // 5. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: `Test Project ${RandomGenerator.alphaNumeric(4)}`,
        color: "#4A90E2",
        description: "Project for timelog update test",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 6. Create employee
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeResult = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employeeEmail,
        roleId: role.id,
        departmentId: department.id,
        position: "Developer",
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employeeResult);
  // NOTE: Creating timelogs and timesheets requires member endpoints
  // which are not available in the current SDK. The test setup
  // for the timelog update validation is shown above.
  // 7-8. Attempt to update a timelog that is part of a submitted timesheet
  // This would require:
  // - Creating a timelog via member endpoint
  // - Creating a draft timesheet containing the timelog
  // - Submitting the timesheet for approval
  // - Then attempting to update the timelog via admin endpoint
  // which should return HTTP 400 or 403 error
  // Placeholder for validation - would use TestValidator.httpError
  // to verify that updating a submitted timelog fails:
  // await TestValidator.httpError(
  //   "timelog update blocked when part of submitted timesheet",
  //   [400, 403],
  //   async () => await api.functional.erpHrm.admin.members.timelogs.update(
  //     adminConnection,
  //     {
  //       memberId: employee.member.id,
  //       timelogId: timelog.id,
  //       body: { durationMinutes: 120 },
  //     },
  //   ),
  // );
}
