import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_detail_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account and get a JWT session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // memberConnection.headers now has the Authorization token set internally
  // Step 2: Create an organization (member becomes owner with full permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // The owner's organization member ID is available from the organization response
  const ownerOrgMemberId = organization.owner.id;
  // Step 3: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 4: Assign the owner as a project member with projectRole='member'
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: ownerOrgMemberId,
          projectRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 5: Create a task with full attributes
  const taskTitle = RandomGenerator.paragraph({ sentences: 3 });
  const taskDescription = RandomGenerator.content({ paragraphs: 1 });
  const estimatedHours = 8;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const createdTask =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: taskTitle,
          description: taskDescription,
          status: "open",
          priority: "high",
          estimated_hours: estimatedHours,
          due_date: dueDate,
          assignee_id: ownerOrgMemberId,
        },
      },
    );
  typia.assert(createdTask);
  // Step 6: Retrieve the full task detail as the project member
  const taskDetail = await api.functional.erpHrm.member.projects.tasks.at(
    memberConnection,
    {
      projectId: project.id,
      taskId: createdTask.id,
    },
  );
  typia.assert(taskDetail);
  // Step 7: Validations
  // id matches created task id
  TestValidator.equals("task id matches", taskDetail.id, createdTask.id);
  // title matches
  TestValidator.equals("task title matches", taskDetail.title, taskTitle);
  // description matches
  TestValidator.equals(
    "task description matches",
    taskDetail.description,
    taskDescription,
  );
  // status is 'open'
  TestValidator.equals("task status is open", taskDetail.status, "open");
  // priority is 'high'
  TestValidator.equals("task priority is high", taskDetail.priority, "high");
  // estimatedHours matches
  TestValidator.equals(
    "task estimatedHours matches",
    taskDetail.estimatedHours,
    estimatedHours,
  );
  // project is non-null with correct id and name
  TestValidator.predicate("project is non-null", taskDetail.project !== null);
  TestValidator.equals("project id matches", taskDetail.project.id, project.id);
  TestValidator.equals(
    "project name matches",
    taskDetail.project.name,
    project.name,
  );
  // assignee is non-null and references the owner
  TestValidator.predicate("assignee is non-null", taskDetail.assignee !== null);
  TestValidator.equals(
    "assignee id matches owner org member id",
    taskDetail.assignee!.id,
    ownerOrgMemberId,
  );
  // parent is null (top-level task)
  TestValidator.equals("parent is null", taskDetail.parent, null);
  // subtasks is an empty array
  TestValidator.predicate(
    "subtasks is empty",
    taskDetail.subtasks.length === 0,
  );
  // taskHistories has at least one entry (creation event)
  TestValidator.predicate(
    "taskHistories has at least one entry",
    taskDetail.taskHistories.length >= 1,
  );
  // The first taskHistory should record the initial status 'open'
  TestValidator.equals(
    "first taskHistory newStatus is open",
    taskDetail.taskHistories[0]!.newStatus,
    "open",
  );
  // deletedAt is null
  TestValidator.equals("deletedAt is null", taskDetail.deletedAt, null);
}
