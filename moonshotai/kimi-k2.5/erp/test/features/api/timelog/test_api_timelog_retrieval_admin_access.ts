import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_retrieval_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin member and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 2. Create organization as admin
  const organization =
    await generate_random_erp_hrm_member_organizations_create(adminConnection, {
      body: {
        name: RandomGenerator.name(3),
        description: null,
        logo_url: null,
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_year_start_month: 1,
      },
    });
  // 3. Create admin role with time:manage permission
  const adminRole = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        name: "Time Manager",
        description: "Role with time management permissions",
        permissions: [
          { permission: "time:manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  // 4. Create admin organization member with elevated role
  await generate_random_erp_hrm_member_organization_members_create(
    adminConnection,
    {
      body: {
        organizationId: organization.id,
        userId: adminAuth.id,
        roleId: adminRole.id,
        departmentId: null,
        position: "Time Administrator",
        employmentType: "full_time",
        isActive: true,
      },
    },
  );
  // 5. Create employee member and authenticate
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 6. Create basic employee role
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        name: "Standard Employee",
        description: "Basic employee role",
        permissions: [] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  // 7. Create employee organization member
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employeeAuth.id,
          roleId: employeeRole.id,
          departmentId: null,
          position: "Developer",
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // 8. Create project as admin
  const project = await generate_random_erp_hrm_member_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        colorCode: "#FF5733",
        description: RandomGenerator.paragraph(),
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      },
    },
  );
  // 9. Assign employee to project
  await generate_random_erp_hrm_member_projects_members_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: employeeOrgMember.id,
        role: "member",
      },
    },
  );
  // 10. Create timelog as employee
  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        billable: true,
        description: RandomGenerator.paragraph(),
      },
    },
  );
  // 11. Admin retrieves employee's timelog
  const retrievedTimelog = await api.functional.erpHrm.member.timelogs.at(
    adminConnection,
    { timelogId: timelog.id },
  );
  // 12. Validate response
  typia.assert(retrievedTimelog);
  // Validate core timelog details
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "start time matches",
    retrievedTimelog.startTime,
    timelog.startTime,
  );
  TestValidator.equals(
    "end time matches",
    retrievedTimelog.endTime,
    timelog.endTime,
  );
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.durationMinutes,
    timelog.durationMinutes,
  );
  TestValidator.equals(
    "billable status matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  // Validate project context
  TestValidator.equals(
    "project context present",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name present",
    retrievedTimelog.project.name,
    project.name,
  );
  // Validate organization member (employee) summary
  TestValidator.equals(
    "organization member ID matches",
    retrievedTimelog.organizationMember.id,
    employeeOrgMember.id,
  );
  TestValidator.equals(
    "employee user ID matches",
    retrievedTimelog.organizationMember.user.id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "employee email present",
    retrievedTimelog.organizationMember.user.email,
    employeeAuth.email,
  );
  // Validate task is null (not assigned in this test)
  TestValidator.equals("task is null as expected", retrievedTimelog.task, null);
}
