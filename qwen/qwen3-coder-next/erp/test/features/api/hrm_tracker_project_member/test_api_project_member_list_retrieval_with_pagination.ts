import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";

export async function test_api_project_member_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with join utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Create project
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: `#${RandomGenerator.alphabets(6).toLowerCase()}`,
        description: null,
        budget_hours: null,
        start_date: null,
        end_date: null,
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create employees (members) and assign to project
  const employeeIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    // First create a new member for each employee
    const memberConnection2: api.IConnection = { host: connection.host };
    const newMember = await authorize_member_join(memberConnection2, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    });
    typia.assert(newMember);
    // Then create employee record (using member ID as employee ID)
    const employeeConnection: api.IConnection = { host: connection.host };
    // Skip this step as employee creation is implicit when joining as member
    employeeIds.push(newMember.id);
  }
  // 4. Assign employees to project with different roles
  for (let i = 0; i < 5; i++) {
    await generate_random_hrm_tracker_member_projects_project_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_tracker_employee_id: employeeIds[i],
          role: i % 2 === 0 ? "member" : "project-lead",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  }
  // 5. Test pagination API with various filters
  // 5-1. Get all members without filter
  const allMembers =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: { page: 1, limit: 100 },
      },
    );
  typia.assert(allMembers);
  TestValidator.equals("total records match", allMembers.data.length, 5);
  // 5-2. Filter by project-lead role
  const leads =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: { role: "project-lead", page: 1, limit: 10 },
      },
    );
  typia.assert(leads);
  leads.data.forEach((m: IHrmTrackerProjectMember.ISummary) =>
    TestValidator.equals("project-lead role", m.role, "project-lead"),
  );
  // 5-3. Filter by member role
  const members =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: { role: "member", page: 1, limit: 10 },
      },
    );
  typia.assert(members);
  members.data.forEach((m: IHrmTrackerProjectMember.ISummary) =>
    TestValidator.equals("member role", m.role, "member"),
  );
  // 5-4. Test pagination (page 1)
  const page1 =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: { page: 1, limit: 3 },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 limit 3", page1.data.length, 3);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  // 5-5. Test pagination (page 2)
  const page2 =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: { page: 2, limit: 3 },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 limit 3", page2.data.length, 2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 5-6. Test sorting
  const sorted =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: { sort: "role,createdAt,desc", page: 1, limit: 10 },
      },
    );
  typia.assert(sorted);
  // 5-7. Test date range filter
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 1);
  const dateFiltered =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          createdAtGte: startDate.toISOString(),
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(dateFiltered);
}
