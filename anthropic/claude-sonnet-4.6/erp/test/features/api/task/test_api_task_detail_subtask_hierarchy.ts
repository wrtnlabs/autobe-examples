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

export async function test_api_task_detail_subtask_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain a JWT session
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // The owner's organizationMemberId is available from organization.owner.id
  const organizationMemberId = organization.owner.id;
  // 3. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  const projectId = project.id;
  // 4. Assign the owner as project-lead so they can create tasks
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          organizationMemberId: organizationMemberId,
          projectRole: "project-lead",
        },
        params: {
          projectId: projectId,
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create a top-level parent task
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Parent Task",
        status: "open",
        priority: "medium",
        parent_id: null,
      },
      params: {
        projectId: projectId,
      },
    },
  );
  typia.assert(parentTask);
  const parentTaskId = parentTask.id;
  // 6. Create a subtask referencing the parent task
  const subtask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Subtask",
        status: "open",
        priority: "medium",
        parent_id: parentTaskId,
      },
      params: {
        projectId: projectId,
      },
    },
  );
  typia.assert(subtask);
  const subtaskId = subtask.id;
  // Assertion A - Retrieve the Parent Task
  const parentTaskDetail = await api.functional.erpHrm.member.projects.tasks.at(
    memberConnection,
    {
      projectId: projectId,
      taskId: parentTaskId,
    },
  );
  typia.assert(parentTaskDetail);
  // Verify parent is null (top-level task)
  TestValidator.equals(
    "parent task has no parent",
    parentTaskDetail.parent,
    null,
  );
  // Verify subtasks array has exactly one entry
  TestValidator.equals(
    "parent task subtasks count",
    parentTaskDetail.subtasks.length,
    1,
  );
  // Verify the subtask entry's id matches subtaskId
  TestValidator.equals(
    "subtask in parent subtasks has correct id",
    parentTaskDetail.subtasks[0]!.id,
    subtaskId,
  );
  // Verify the subtask entry's parentId equals parentTaskId
  TestValidator.equals(
    "subtask in parent subtasks has correct parentId",
    parentTaskDetail.subtasks[0]!.parentId,
    parentTaskId,
  );
  // Assertion B - Retrieve the Subtask
  const subtaskDetail = await api.functional.erpHrm.member.projects.tasks.at(
    memberConnection,
    {
      projectId: projectId,
      taskId: subtaskId,
    },
  );
  typia.assert(subtaskDetail);
  // Verify parent is non-null and parent.id equals parentTaskId
  TestValidator.predicate(
    "subtask has a parent",
    subtaskDetail.parent !== null,
  );
  TestValidator.equals(
    "subtask parent id matches parentTaskId",
    subtaskDetail.parent!.id,
    parentTaskId,
  );
  // Verify subtasks is an empty array (subtasks cannot have their own subtasks)
  TestValidator.equals(
    "subtask has no subtasks",
    subtaskDetail.subtasks.length,
    0,
  );
}
