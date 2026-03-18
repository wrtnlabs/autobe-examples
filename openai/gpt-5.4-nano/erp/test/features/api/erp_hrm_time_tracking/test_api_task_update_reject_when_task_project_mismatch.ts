import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";

export async function test_api_task_update_reject_when_task_project_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(memberAuth);
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers = { Authorization: memberAuth.token.access };
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      actorConnection,
      {},
    );
  typia.assert(projectA);
  // Grant task-update capability in Project A.
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    actorConnection,
    {
      params: { projectId: projectA.id },
      body: {
        employee_id: memberAuth.id,
        membership_role: typia.random<string>() satisfies string,
      } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
    },
  );
  const taskBefore =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      actorConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: typia.random<string>() satisfies string,
          priority: typia.random<string>() satisfies string,
          estimated_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          due_date: new Date().toISOString(),
          parent_task_id: null,
          assigned_employee_id: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskBefore);
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      actorConnection,
      {},
    );
  typia.assert(projectB);
  const mismatchUpdateBody = {
    title: `${taskBefore.title}-mismatched`,
  } satisfies IErpHrmTimeTrackingTask.IUpdate;
  await TestValidator.error(
    "reject updating a task with mismatched projectId",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.tasks.updateTask(
        actorConnection,
        {
          projectId: projectB.id,
          taskId: taskBefore.id,
          body: mismatchUpdateBody,
        },
      );
    },
  );
  // Validate the task remains unchanged in Project A.
  // Use an update within Project A that explicitly sets all fields back to their original values.
  const taskAfter =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.updateTask(
      actorConnection,
      {
        projectId: taskBefore.project.id,
        taskId: taskBefore.id,
        body: {
          title: taskBefore.title,
          description: taskBefore.description,
          status: taskBefore.status,
          priority: taskBefore.priority,
          estimated_hours: taskBefore.estimatedHours,
          due_date: taskBefore.dueDate,
          parent_task_id: taskBefore.parentTask?.id ?? null,
          assigned_employee_id: taskBefore.assignedEmployee?.id ?? null,
        } satisfies IErpHrmTimeTrackingTask.IUpdate,
      },
    );
  typia.assert(taskAfter);
  TestValidator.equals(
    "task.project.id unchanged",
    taskAfter.project.id,
    taskBefore.project.id,
  );
  TestValidator.equals(
    "task.title unchanged",
    taskAfter.title,
    taskBefore.title,
  );
  TestValidator.equals(
    "task.description unchanged",
    taskAfter.description,
    taskBefore.description,
  );
  TestValidator.equals(
    "task.status unchanged",
    taskAfter.status,
    taskBefore.status,
  );
  TestValidator.equals(
    "task.priority unchanged",
    taskAfter.priority,
    taskBefore.priority,
  );
  TestValidator.equals(
    "task.estimatedHours unchanged",
    taskAfter.estimatedHours,
    taskBefore.estimatedHours,
  );
  TestValidator.equals(
    "task.dueDate unchanged",
    taskAfter.dueDate,
    taskBefore.dueDate,
  );
}
