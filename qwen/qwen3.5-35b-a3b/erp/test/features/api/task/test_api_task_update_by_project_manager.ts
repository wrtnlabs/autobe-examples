import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_update_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IHrmsMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Store the email for verification
  const originalEmail = memberAuth.email;
  const originalDisplayName = memberAuth.display_name;
  // 2. We need an organization to work with
  // Since we cannot create organizations through the member APIs,
  // we'll use the member's organization from their profile
  if (memberAuth.organization_memberships.length === 0) {
    throw new Error(
      "Member has no organization memberships - cannot test project management",
    );
  }
  const organization = memberAuth.organization_memberships[0].organization;
  const organizationRole =
    memberAuth.organization_memberships[0].organizationRole;
  // 3. Create a project that the member can manage (they need project:manage permission)
  // For this test, we assume the member has project:manage through their role
  // In real scenario, role would have this permission
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: RandomGenerator.name(),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  const projectTyped = typia.assert<IHrmsProject & { id: string }>(project);
  // 4. Create a task in the project for the manager to update
  const taskTitle = RandomGenerator.name();
  const taskDescription = RandomGenerator.paragraph({ sentences: 2 });
  const task = await api.functional.hrms.member.projects.tasks.create(
    memberConnection,
    {
      projectId: projectTyped.id,
      body: {
        title: taskTitle,
        description: taskDescription,
        status: "open" as const,
        priority: "medium" as const,
      } satisfies IHrmsTask.ICreate,
    },
  );
  typia.assert(task);
  const taskTyped = typia.assert<IHrmsTask & { id: string; title: string; description: string; status: string; priority: string }>(task);
  // 5. Update the task as the project manager (not project lead)
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTask = await api.functional.hrms.member.projects.tasks.update(
    memberConnection,
    {
      projectId: projectTyped.id,
      taskId: taskTyped.id,
      body: {
        description: newDescription,
        status: "in-progress" as const,
        priority: "high" as const,
      } satisfies IHrmsTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  const updatedTaskTyped = typia.assert<IHrmsTask & { title: string; description: string; status: string; priority: string }>(updatedTask);
  // 6. Validate the task was successfully updated
  TestValidator.equals(
    "task description updated",
    updatedTaskTyped.description,
    newDescription,
  );
  TestValidator.equals(
    "task status updated to in-progress",
    updatedTaskTyped.status,
    "in-progress",
  );
  TestValidator.equals(
    "task priority updated to high",
    updatedTaskTyped.priority,
    "high",
  );
  TestValidator.equals("task title unchanged", updatedTaskTyped.title, taskTitle);
  TestValidator.equals(
    "task original description not in updated",
    !!updatedTaskTyped.description,
    false,
  );
  // Verify the updated task is different from original
  TestValidator.notEquals(
    "task was modified",
    task,
    updatedTask,
    (key) => key === "updated_at",
  );
}
