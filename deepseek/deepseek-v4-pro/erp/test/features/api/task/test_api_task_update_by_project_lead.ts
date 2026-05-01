import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test task update by project lead with partial update semantics.
 *
 * Validates that a project lead can update multiple editable fields of a task
 * within their project. The test authenticates a new member, creates an active
 * project, assigns a project-lead role, creates a task with default values
 * (open status, medium priority), then updates the task's title, priority,
 * description, estimated hours, and due date.
 *
 * The test verifies partial update behavior where only explicitly provided
 * fields are modified while unchanged fields like status and project
 * association retain their original values. Special attention is given to
 * verifying that the updated_at timestamp advances after modification and that
 * the full IErpHrmTask response includes nested project summary, assigned
 * employee, and status histories.
 *
 * 1. Member authenticates via join to obtain JWT access token.
 * 2. Member creates an active project for task management.
 * 3. Project member is assigned with project-lead role.
 * 4. Task is created with default open status and medium priority.
 * 5. Task is updated with new title, high priority, description, estimated
 *    hours, and future due date.
 * 6. Response is validated for all updated fields, confirming full IErpHrmTask
 *    response structure.
 * 7. Unchanged fields (status, project) are verified at original values.
 * 8. updated_at timestamp is confirmed to have advanced.
 */
export async function test_api_task_update_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign project-lead role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: { role: "project-lead" },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Create task with default values (open status, medium priority)
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: { status: "open", priority: "medium" },
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 5. Prepare update data
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const updatedEstimatedHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const updatedDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 6. Update task with partial update semantics
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        title: updatedTitle,
        priority: "high",
        description: updatedDescription,
        estimated_hours: updatedEstimatedHours,
        due_date: updatedDueDate,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 7. Validate updated fields
  TestValidator.equals("title updated", updatedTask.title, updatedTitle);
  TestValidator.equals("priority updated", updatedTask.priority, "high");
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    updatedDescription,
  );
  TestValidator.equals(
    "estimated hours updated",
    updatedTask.estimated_hours,
    updatedEstimatedHours,
  );
  TestValidator.equals(
    "due date updated",
    updatedTask.due_date,
    updatedDueDate,
  );
  // 8. Validate unchanged fields
  TestValidator.equals("status unchanged", updatedTask.status, "open");
  TestValidator.equals(
    "project association unchanged",
    updatedTask.project.id,
    project.id,
  );
  // 9. Validate timestamp advanced
  TestValidator.predicate(
    "updated_at advanced after update",
    () => updatedTask.updated_at > task.updated_at,
  );
}
