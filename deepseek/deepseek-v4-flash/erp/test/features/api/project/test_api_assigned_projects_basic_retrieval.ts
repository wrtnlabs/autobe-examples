import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";

export async function test_api_assigned_projects_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(auth);
  // 2. Create organization (creates employee record for owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-login to get updated employee data (employees at join time was empty)
  const auth2 = await authorize_member_login(memberConnection, {
    body: {
      email,
      password,
      href: "",
      referrer: "",
    },
  });
  typia.assert(auth2);
  const employee = auth2.employees[0]!;
  typia.assert(employee);
  // 4. Create two projects
  const project1 =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project1);
  const project2 =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project2);
  // 5. Add employee to project 1 with role 'member'
  const member1 =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project1.id },
        body: {
          employee_id: employee.id,
          role: "member" as const,
        },
      },
    );
  typia.assert(member1);
  // 6. Add employee to project 2 with role 'project-lead'
  const member2 =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project2.id },
        body: {
          employee_id: employee.id,
          role: "project-lead" as const,
        },
      },
    );
  typia.assert(member2);
  // 7. Retrieve assigned projects
  const page =
    await api.functional.hrmTimeTracking.member.projects.assigned.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(page);
  // 8. Validate pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 100);
  TestValidator.equals("pagination records", page.pagination.records, 2);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  // 9. Validate both projects are present with correct data
  TestValidator.equals("project count", page.data.length, 2);
  const p1 = page.data.find((p) => p.id === project1.id)!;
  const p2 = page.data.find((p) => p.id === project2.id)!;
  TestValidator.equals("project1 name", p1.name, project1.name);
  TestValidator.equals("project1 colorCode", p1.colorCode, project1.color_code);
  TestValidator.equals("project1 status", p1.status, "active");
  TestValidator.equals("project2 name", p2.name, project2.name);
  TestValidator.equals("project2 colorCode", p2.colorCode, project2.color_code);
  TestValidator.equals("project2 status", p2.status, "active");
}