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
 * Validates that a project lead can retrieve the full details of a task within their led project.
 *
 * Confirms that the project-lead role satisfies the authorization check for viewing tasks via the GET endpoint. The test establishes a member session, creates a project, assigns the member as project-lead, creates a task, then retrieves it. The response must return the complete task entity with the correct id, title, and project reference.
 *
 * 1. Authenticate as a member to establish an authorized session with JWT tokens.
 * 2. Create a project to serve as the task container.
 * 3. Assign the authenticated member as project-lead on the project and validate the role assignment.
 * 4. Create a task within the project.
 * 5. Retrieve the task using the GET endpoint as the project lead.
 * 6. Validate the retrieved task entity matches the created task in id, title, and project reference.
 */
export async function test_api_task_retrieval_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to establish an authorized session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project that will contain the task
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign the authenticated member as project-lead to grant elevated task management permissions
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: { role: "project-lead" },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  TestValidator.equals(
    "assigned role is project-lead",
    projectMember.role,
    "project-lead",
  );
  // 4. Create a task within the project to be retrieved
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 5. Retrieve the task as the project lead via the GET endpoint
  const retrievedTask = await api.functional.erpHrm.member.projects.tasks.at(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  typia.assert(retrievedTask);
  // 6. Validate the retrieved task matches the created task
  TestValidator.equals(
    "retrieved task id matches created task id",
    retrievedTask.id,
    task.id,
  );
  TestValidator.equals(
    "retrieved task title matches created task title",
    retrievedTask.title,
    task.title,
  );
  TestValidator.equals(
    "task project id matches parent project",
    retrievedTask.project.id,
    project.id,
  );
}
