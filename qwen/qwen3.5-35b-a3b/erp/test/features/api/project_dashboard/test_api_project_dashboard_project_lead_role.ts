import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_project_dashboard_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create new connection with member token
  const memberApiConnection: api.IConnection = { host: connection.host };
  memberApiConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Retrieve organization
  const orgList = await api.functional.hrms.member.organizations.index(
    memberApiConnection,
    {
      body: {
        limit: 1,
        page: 1,
      },
    },
  );
  typia.assert(orgList);
  TestValidator.predicate(
    "organization list not empty",
    orgList.data.length > 0,
  );
  const organization = orgList.data[0];
  // 4. Create first project (member will be project lead)
  const project1Raw =
    await api.functional.hrms.member.organizations.projects.create(
      memberApiConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Project Lead Test",
          color_code: "#3498db",
          budget_hours: 100,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project1Raw);
  const project1 = typia.assert<IHrmsProject.ISummary>(project1Raw);
  // 5. Create second project (member will be regular member)
  const project2Raw =
    await api.functional.hrms.member.organizations.projects.create(
      memberApiConnection,
      {
        organizationId: organization.id,
        body: {
          name: "Project Member Test",
          color_code: "#e74c3c",
          budget_hours: 50,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project2Raw);
  const project2 = typia.assert<IHrmsProject.ISummary>(project2Raw);
  // 6. Add member as project lead to first project
  const membership1 =
    await api.functional.hrms.member.projects.members.addMember(
      memberApiConnection,
      {
        projectId: project1.id,
        body: {
          employee_id: memberAuth.id,
          role: "project-lead",
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(membership1);
  // 7. Add member as regular member to second project
  const membership2 =
    await api.functional.hrms.member.projects.members.addMember(
      memberApiConnection,
      {
        projectId: project2.id,
        body: {
          employee_id: memberAuth.id,
          role: "member",
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(membership2);
  // 8. Create task for first project
  const task1 = await api.functional.hrms.member.projects.tasks.create(
    memberApiConnection,
    {
      projectId: project1.id,
      body: {
        title: "Task for Lead Project",
        status: "open",
        priority: "medium",
      } satisfies IHrmsTask.ICreate,
    },
  );
  typia.assert(task1);
  // 9. Create task for second project
  const task2 = await api.functional.hrms.member.projects.tasks.create(
    memberApiConnection,
    {
      projectId: project2.id,
      body: {
        title: "Task for Member Project",
        status: "in-progress",
        priority: "high",
      } satisfies IHrmsTask.ICreate,
    },
  );
  typia.assert(task2);
  // 10. Call dashboard endpoint
  const dashboard = typia.assert<IHrmsProject>(
    await api.functional.hrms.member.projects.dashboard(memberApiConnection),
  );
  // 11. Validate dashboard has budget_alerts (projects)
  TestValidator.predicate(
    "dashboard has budget_alerts",
    dashboard.budget_alerts !== undefined,
  );
  TestValidator.equals(
    "dashboard has 2 projects in budget_alerts",
    dashboard.budget_alerts?.length,
    2,
  );
  // 12. Validate project lead role for first project
  const leadProject = dashboard.budget_alerts?.find(
    (p) => p.id === project1.id,
  );
  TestValidator.predicate(
    "lead project found in dashboard budget_alerts",
    leadProject !== undefined,
  );
  // 13. Validate regular member role for second project
  const memberProject = dashboard.budget_alerts?.find(
    (p) => p.id === project2.id,
  );
  TestValidator.predicate(
    "member project found in dashboard budget_alerts",
    memberProject !== undefined,
  );
  // 14. Validate budget utilization is calculated for both projects (may be 0 if no timelogs)
  TestValidator.predicate(
    "lead project has budget utilization value",
    leadProject!.budget_utilization_percentage !== undefined,
  );
  TestValidator.predicate(
    "member project has budget utilization value",
    memberProject!.budget_utilization_percentage !== undefined,
  );
  // 15. Validate task counts for both projects
  TestValidator.equals(
    "lead project has total_tasks count",
    leadProject!.total_tasks,
    1,
  );
  TestValidator.equals(
    "member project has total_tasks count",
    memberProject!.total_tasks,
    1,
  );
  // 16. Validate project metadata includes organization_name
  TestValidator.equals(
    "lead project has organization_name",
    leadProject!.organization_name,
    organization.name,
  );
  TestValidator.equals(
    "member project has organization_name",
    memberProject!.organization_name,
    organization.name,
  );
}
