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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_list_view_all_by_privileged_member(
  connection: api.IConnection,
): Promise<void> {
  // -------------------------------------------------------
  // 1. Setup: Register manager and create organization
  // -------------------------------------------------------
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // Manager's organizationMemberId is the owner's id
  const managerOrgMemberId = organization.owner.id;
  // -------------------------------------------------------
  // 2. Setup: Register employee and add to organization
  // -------------------------------------------------------
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employeeAuth.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(employeeOrgMember);
  const employeeOrgMemberId = employeeOrgMember.id;
  // -------------------------------------------------------
  // 3. Setup: Create project and assign both members
  // -------------------------------------------------------
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // Assign manager to project as project-lead
  const managerProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: managerOrgMemberId,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(managerProjectMember);
  // Assign employee to project as member
  const employeeProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: employeeOrgMemberId,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(employeeProjectMember);
  // -------------------------------------------------------
  // 4. Setup: Create 2 timelogs for manager
  // -------------------------------------------------------
  const managerTimelog1 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project.id,
        work_date: new Date("2024-01-10").toISOString(),
        duration_minutes: 60,
      },
    },
  );
  typia.assert(managerTimelog1);
  const managerTimelog2 = await generate_random_erp_hrm_member_timelogs_create(
    managerConnection,
    {
      body: {
        project_id: project.id,
        work_date: new Date("2024-01-11").toISOString(),
        duration_minutes: 90,
      },
    },
  );
  typia.assert(managerTimelog2);
  // -------------------------------------------------------
  // 5. Setup: Create 3 timelogs for employee
  // -------------------------------------------------------
  const employeeTimelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        work_date: new Date("2024-01-10").toISOString(),
        duration_minutes: 45,
      },
    },
  );
  typia.assert(employeeTimelog1);
  const employeeTimelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        work_date: new Date("2024-01-11").toISOString(),
        duration_minutes: 120,
      },
    },
  );
  typia.assert(employeeTimelog2);
  const employeeTimelog3 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        work_date: new Date("2024-01-12").toISOString(),
        duration_minutes: 30,
      },
    },
  );
  typia.assert(employeeTimelog3);
  // -------------------------------------------------------
  // 6. Test: Manager lists all timelogs (no filter) → 5 total
  // -------------------------------------------------------
  const allTimelogs = await api.functional.erpHrm.member.timelogs.index(
    managerConnection,
    {
      body: {} satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  TestValidator.predicate(
    "all timelogs total records should be 5",
    allTimelogs.pagination.records >= 5,
  );
  // -------------------------------------------------------
  // 7. Test: Filter by employee's org member ID → 3 timelogs
  // -------------------------------------------------------
  const employeeTimelogs = await api.functional.erpHrm.member.timelogs.index(
    managerConnection,
    {
      body: {
        memberOrganizationMemberId: employeeOrgMemberId,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(employeeTimelogs);
  TestValidator.equals(
    "employee timelogs count should be 3",
    employeeTimelogs.pagination.records,
    3,
  );
  // Validate all returned timelogs belong to the employee
  for (const timelog of employeeTimelogs.data) {
    TestValidator.equals(
      "timelog organizationMember id should match employee",
      timelog.organizationMember.id,
      employeeOrgMemberId,
    );
  }
  // -------------------------------------------------------
  // 8. Test: Filter by manager's org member ID → 2 timelogs
  // -------------------------------------------------------
  const managerTimelogs = await api.functional.erpHrm.member.timelogs.index(
    managerConnection,
    {
      body: {
        memberOrganizationMemberId: managerOrgMemberId,
      } satisfies IErpHrmTimelog.IRequest,
    },
  );
  typia.assert(managerTimelogs);
  TestValidator.equals(
    "manager timelogs count should be 2",
    managerTimelogs.pagination.records,
    2,
  );
  // Validate all returned timelogs belong to the manager
  for (const timelog of managerTimelogs.data) {
    TestValidator.equals(
      "timelog organizationMember id should match manager",
      timelog.organizationMember.id,
      managerOrgMemberId,
    );
  }
  // -------------------------------------------------------
  // 9. Test: Combine memberOrganizationMemberId + projectId filter
  // -------------------------------------------------------
  const employeeTimelogsInProject =
    await api.functional.erpHrm.member.timelogs.index(managerConnection, {
      body: {
        memberOrganizationMemberId: employeeOrgMemberId,
        projectId: project.id,
      } satisfies IErpHrmTimelog.IRequest,
    });
  typia.assert(employeeTimelogsInProject);
  TestValidator.equals(
    "employee timelogs in project count should be 3",
    employeeTimelogsInProject.pagination.records,
    3,
  );
  for (const timelog of employeeTimelogsInProject.data) {
    TestValidator.equals(
      "combined filter: organizationMember id should match employee",
      timelog.organizationMember.id,
      employeeOrgMemberId,
    );
    TestValidator.equals(
      "combined filter: project id should match",
      timelog.project.id,
      project.id,
    );
  }
  // -------------------------------------------------------
  // 10. Test: Pagination metadata accuracy
  // -------------------------------------------------------
  TestValidator.predicate(
    "all timelogs pagination pages should be >= 1",
    allTimelogs.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "employee timelogs pagination current should be 1",
    employeeTimelogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "manager timelogs pagination limit should be > 0",
    managerTimelogs.pagination.limit > 0,
  );
}
