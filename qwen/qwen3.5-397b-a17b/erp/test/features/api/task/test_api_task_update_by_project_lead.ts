import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that a project lead can successfully update task attributes within their assigned project.
 *
 * Validates the complete task update workflow including member authentication, organization creation, project setup, project-lead assignment, task creation, and task modification. Ensures that project leads have the necessary permissions to modify task attributes including title, description, priority, and estimated hours.
 *
 * The test verifies that updated task fields match the modification request, the updated_at timestamp reflects the modification time (newer than created_at), and the task maintains its association with the original project throughout the update operation.
 *
 * 1. Member registers and authenticates with the platform.
 * 2. Creates an organization as the container for all business entities.
 * 3. Creates a project within the organization with name and color.
 * 4. Assigns the member as project-lead to enable task management permissions.
 * 5. Creates an initial task with title, description, priority, and estimated hours.
 * 6. Updates the task with modified values for all editable fields.
 * 7. Validates that all updated fields match the modification request and timestamps are correct.
 */
export async function test_api_task_update_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create project within organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  // 4. Assign member as project-lead
  const projectMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMembership);
  // 5. Create initial task
  const initialTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(initialTask);
  // 6. Update task with modified values
  const updatePayload = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    priority: "urgent",
    estimated_hours: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    status: "in-progress",
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: initialTask.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedTask);
  // 7. Validate update results
  TestValidator.equals("title updated", updatedTask.title, updatePayload.title);
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "priority updated",
    updatedTask.priority,
    updatePayload.priority,
  );
  TestValidator.equals(
    "estimated_hours updated",
    updatedTask.estimated_hours,
    updatePayload.estimated_hours,
  );
  TestValidator.equals(
    "status updated",
    updatedTask.status,
    updatePayload.status,
  );
  TestValidator.equals("project unchanged", updatedTask.project.id, project.id);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTask.updated_at) > new Date(updatedTask.created_at),
  );
  TestValidator.notEquals(
    "updated_at changed from initial",
    updatedTask.updated_at,
    initialTask.updated_at,
  );
}
