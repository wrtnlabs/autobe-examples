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

export async function test_api_project_member_list_includes_deactivated_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member who manages the project
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // 2. Create a project and assign admin as project-lead
  const project = await api.functional.hrmTracker.member.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // Assign admin as project-lead (create employee record first)
  const adminEmployee = await api.functional.hrmTracker.member.employees.update(
    adminConnection,
    {
      employeeId: adminMember.id,
      body: {
        status: "active",
      } satisfies IHrmTrackerEmployee.IUpdate,
    },
  );
  typia.assert(adminEmployee);
  const adminProjectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      adminConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: adminEmployee.id,
          role: "project-lead",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(adminProjectMember);
  // 3. Create second member who will be assigned to project
  const employeeConnection: api.IConnection = { host: connection.host };
  const assignedMember = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Create employee record for assigned member
  const assignedEmployee =
    await api.functional.hrmTracker.member.employees.update(adminConnection, {
      employeeId: assignedMember.id,
      body: {
        status: "active",
      } satisfies IHrmTrackerEmployee.IUpdate,
    });
  typia.assert(assignedEmployee);
  // 4. Assign second member to project
  const employeeProjectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      adminConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: assignedEmployee.id,
          role: "member",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(employeeProjectMember);
  // 5. Deactivate the assigned employee
  await api.functional.hrmTracker.member.employees.update(adminConnection, {
    employeeId: assignedEmployee.id,
    body: {
      status: "deactivated",
    } satisfies IHrmTrackerEmployee.IUpdate,
  });
  // 6. Retrieve project members and verify deactivated member is included
  const members =
    await api.functional.hrmTracker.member.projects.projectMembers.index(
      adminConnection,
      {
        projectId: project.id,
        body: {
          limit: 100,
        } satisfies IHrmTrackerProjectMember.IRequest,
      },
    );
  typia.assert(members);
  // Verify deactivated member appears in list with correct status
  const deactivatedMember = members.data.find(
    (m) => m.employee.id === assignedEmployee.id,
  );
  TestValidator.equals("deactivated member found", !!deactivatedMember, true);
  TestValidator.equals(
    "deactivated employee status is deactivated",
    deactivatedMember!.employee.status,
    "deactivated",
  );
  TestValidator.equals(
    "project member role preserved",
    deactivatedMember!.role,
    "member",
  );
}
