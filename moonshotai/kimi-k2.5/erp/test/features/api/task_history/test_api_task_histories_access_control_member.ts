import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_histories_access_control_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (project owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      firstName: "Project",
      lastName: "Owner",
    },
  });
  typia.assert(member1);
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      {
        body: {
          name: typia.random<string>(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // Step 3: Create role with employee management permission
  const permissions: IErpHrmRolePermission.ICreate[] = [
    { permission: "employee.manage" },
    { permission: "project.manage" },
    { permission: "task.manage" },
  ];
  const role = await generate_random_erp_hrm_member_roles_create(
    member1Connection,
    {
      body: {
        name: "Project Manager",
        description: "Role with project and employee management permissions",
        permissions,
      },
    },
  );
  typia.assert(role);
  // Step 4: Create organization member for first user
  const orgMember1 =
    await generate_random_erp_hrm_member_organization_members_create(
      member1Connection,
      {
        body: {
          organizationId: organization.id,
          userId: member1.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
          position: "Project Lead",
        },
      },
    );
  typia.assert(orgMember1);
  // Step 5: Create second member (will be denied access initially)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      firstName: "Regular",
      lastName: "Employee",
    },
  });
  typia.assert(member2);
  // Step 6: Create organization member for second user (employee role, not project member)
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    member1Connection,
    {
      body: {
        name: "Employee",
        description: "Basic employee role",
        permissions: [{ permission: "employee.view" }],
      },
    },
  );
  typia.assert(employeeRole);
  const orgMember2 =
    await generate_random_erp_hrm_member_organization_members_create(
      member1Connection,
      {
        body: {
          organizationId: organization.id,
          userId: member2.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
          position: "Developer",
        },
      },
    );
  typia.assert(orgMember2);
  // Step 7: Create project with first member
  const project = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: {
        name: typia.random<string>(),
        description: "Test project for access control validation",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 8: Create task assigned to member 1
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    member1Connection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for History Access Control",
        description: "This task is used to test history access permissions",
        status: "Open",
        priority: "High",
        assigned_to_id: orgMember1.id,
      },
    },
  );
  typia.assert(task);
  // Step 9: Verify member 1 (project owner) can successfully query task history
  const historyRequest: IErpHrmTaskHistory.IRequest = {
    page: 1,
    limit: 10,
  };
  const member1History: IPageIErpHrmTaskHistory.ISummary =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      member1Connection,
      {
        projectId: project.id,
        taskId: task.id,
        body: historyRequest,
      },
    );
  typia.assert(member1History);
  // Verify pagination structure
  TestValidator.predicate(
    "member 1 history pagination valid",
    member1History.pagination.current === 1,
  );
  // Step 10: Verify member 2 (non-project member) gets 403 Forbidden
  await TestValidator.httpError(
    "non-project member should be denied access to task history",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.histories.index(
        member2Connection,
        {
          projectId: project.id,
          taskId: task.id,
          body: historyRequest,
        },
      );
    },
  );
  // Step 11: Test filtering by changed_by_member_id using member 1's ID
  // Since task was just created, there should be at least one history entry
  if (member1History.data.length > 0) {
    const filteredRequest: IErpHrmTaskHistory.IRequest = {
      page: 1,
      limit: 10,
      changedByMemberId: member1.id,
    };
    const filteredHistory: IPageIErpHrmTaskHistory.ISummary =
      await api.functional.erpHrm.member.projects.tasks.histories.index(
        member1Connection,
        {
          projectId: project.id,
          taskId: task.id,
          body: filteredRequest,
        },
      );
    typia.assert(filteredHistory);
    // Verify all returned entries are by member 1
    TestValidator.predicate(
      "filtered history only contains entries by member 1",
      filteredHistory.data.every((entry) => entry.changed_by.id === member1.id),
    );
  }
  // Test date range filtering (should return results or empty based on range)
  const dateRangeRequest: IErpHrmTaskHistory.IRequest = {
    page: 1,
    limit: 10,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    endDate: new Date().toISOString(),
  };
  const dateRangeHistory: IPageIErpHrmTaskHistory.ISummary =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      member1Connection,
      {
        projectId: project.id,
        taskId: task.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeHistory);
}
