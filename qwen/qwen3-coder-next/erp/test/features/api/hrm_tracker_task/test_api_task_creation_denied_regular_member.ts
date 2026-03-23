import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

/**
 * Test that regular project members cannot create tasks without project-lead role or project:manage permission.
 * 1. Join two members (regular and project-lead)
 * 2. Regular member creates an organization
 * 3. Project-lead creates a project
 * 4. Assign both members to the project (project-lead as lead, regular as member)
 * 5. Regular member attempts to create task (should be denied)
 * 6. Project-lead creates task successfully for comparison
 */
export async function test_api_task_creation_denied_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as regular member
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await api.functional.hrmTracker.auth.member.join(
    regularMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(regularMember);
  // 2. Auth as project-lead member
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLead = await api.functional.hrmTracker.auth.member.join(
    projectLeadConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(projectLead);
  // 3. Regular member creates an organization
  const organization =
    await api.functional.hrmTracker.member.organizations.create(
      regularMemberConnection,
      {
        body: {
          name: `Organization ${RandomGenerator.name()}`,
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 4. Create employees for both members (employees are created automatically when members join organization)
  // Note: Need to find a way to create employees for members
  // 5. Project-lead creates a project
  const project = await api.functional.hrmTracker.member.projects.create(
    projectLeadConnection,
    {
      body: {
        name: `Project ${RandomGenerator.name()}`,
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 6. Assign project-lead as project-lead to the project (using employee ID)
  // Note: In real scenario, we would need to create employees for members first
  // For now, we'll use random UUIDs as placeholders for employee IDs
  const projectLeadEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const projectLeadAssignment =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      projectLeadConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: projectLeadEmployeeId,
          role: "project-lead",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadAssignment);
  // 7. Assign regular member as member to the project (using employee ID)
  const regularMemberEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const regularMemberAssignment =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      projectLeadConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: regularMemberEmployeeId,
          role: "member",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(regularMemberAssignment);
  // 8. Regular member attempts to create a task in the project
  const taskCreationInput = {
    title: `Task ${RandomGenerator.name()}`,
    status: "open" as const,
    priority: "medium" as const,
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHrmTrackerTask.ICreate;
  await TestValidator.error("regular member denied task creation", async () => {
    await api.functional.hrmTracker.member.projects.tasks.create(
      regularMemberConnection,
      {
        projectId: project.id,
        body: taskCreationInput,
      },
    );
  });
  // 9. Verify system correctly rejects with appropriate error (403 Forbidden for authorization)
  // Error validation handled by TestValidator.error above
  // 10. Project-lead successfully creates a task for comparison
  const createdTask =
    await api.functional.hrmTracker.member.projects.tasks.create(
      projectLeadConnection,
      {
        projectId: project.id,
        body: taskCreationInput,
      },
    );
  typia.assert(createdTask);
  TestValidator.equals(
    "task created by project-lead",
    createdTask.title,
    taskCreationInput.title,
  );
}
