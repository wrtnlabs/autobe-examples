import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_deletion_with_subtasks_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A5A7C",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create the parent task
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "high",
        status: "open",
      },
    },
  );
  typia.assert(parentTask);
  // 4. Create a subtask linked to the parent task
  const subtask1 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
        parent_id: parentTask.id,
      },
    },
  );
  typia.assert(subtask1);
  // 5. Create another subtask as a child of the first subtask (one-level nesting)
  const subtask2 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "low",
        status: "open",
        parent_id: subtask1.id,
      },
    },
  );
  typia.assert(subtask2);
  // Validation: Verify all tasks have correct structure before deletion
  TestValidator.equals(
    "parent task has no parent",
    parentTask.subtasks.length >= 0,
    true,
  );
  // 6. Delete the root parent task - this should cascade delete subtask1 and subtask2
  await api.functional.erpHrm.member.projects.tasks.erase(memberConnection, {
    projectId: project.id,
    taskId: parentTask.id,
  });
  // Validation: Attempting to delete already deleted task should fail with 404
  await TestValidator.error(
    "parent task already deleted - cannot delete again",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(
        memberConnection,
        {
          projectId: project.id,
          taskId: parentTask.id,
        },
      );
    },
  );
  // Validation: Attempting to delete cascade-deleted subtask1 should fail
  await TestValidator.error(
    "subtask1 already deleted via cascade",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(
        memberConnection,
        {
          projectId: project.id,
          taskId: subtask1.id,
        },
      );
    },
  );
  // Validation: Attempting to delete cascade-deleted subtask2 should fail
  await TestValidator.error(
    "subtask2 already deleted via cascade",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(
        memberConnection,
        {
          projectId: project.id,
          taskId: subtask2.id,
        },
      );
    },
  );
}
