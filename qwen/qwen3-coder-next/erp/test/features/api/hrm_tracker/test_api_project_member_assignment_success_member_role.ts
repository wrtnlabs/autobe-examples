import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_employees_create } from "../../../generate/generate_random_hrm_tracker_member_employees_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { prepare_random_hrm_tracker_employee } from "../../../prepare/prepare_random_hrm_tracker_employee";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";

export async function test_api_project_member_assignment_success_member_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: "Admin User",
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(admin);
  // 2. Create project
  const project = await api.functional.hrmTracker.member.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        description: null,
        budget_hours: null,
        start_date: null,
        end_date: null,
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create active employee in same organization
  const employee = await api.functional.hrmTracker.member.employees.create(
    adminConnection,
    {
      body: {
        employment_type: "full-time",
        status: "active",
        position: null,
        department_id: null,
        role_id: null,
        organization_id: project.organization.id,
        user_id: admin.id,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  TestValidator.predicate("employee is active", employee.status === "active");
  // 4. Assign employee to project as member role
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      adminConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: employee.id,
          role: "member" as const,
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Validate project member record
  TestValidator.equals(
    "employee matches",
    projectMember.employee?.id,
    employee.id,
  );
  TestValidator.equals(
    "project matches",
    projectMember.project?.id,
    project.id,
  );
  TestValidator.equals("role is member", projectMember.role, "member");
}
