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

export async function test_api_project_member_assignment_success_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create project
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create active employee
  const employee = await api.functional.hrmTracker.member.employees.create(
    memberConnection,
    {
      body: {
        employment_type: "full-time" as const,
        status: "active" as const,
        position: "Developer",
        organization_id: project.organization.id,
        user_id: member.id,
        department_id: null,
        role_id: null,
      } satisfies IHrmTrackerEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 4. Assign employee to project as project-lead
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: employee.id,
          role: "project-lead" as const,
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Validate
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
  TestValidator.equals(
    "role is project-lead",
    projectMember.role,
    "project-lead",
  );
}