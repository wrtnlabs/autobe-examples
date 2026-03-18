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

export async function test_api_task_update_project_lead_reassign_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Project lead member account
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadJoin = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(projectLeadJoin);
  // 2) Create active project
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      projectLeadConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#112233",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // 3) Create another member and add to same project
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberJoin = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 4,
      href: "https://example.com/join2",
      referrer: "https://example.com/referrer2",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(secondMemberJoin);
  const secondMembership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      projectLeadConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: secondMemberJoin.id,
          membership_role: "member",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(secondMembership);
  // Ensure caller has project-lead role in this project
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: projectLeadJoin.id,
        membership_role: "project-lead",
      } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
    },
  );
  // 4) Create a task initially assigned to the lead
  const createdTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      projectLeadConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "medium",
          estimated_hours: 2,
          due_date: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 10,
          ).toISOString(),
          assigned_employee_id: projectLeadJoin.id,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(createdTask);
  const beforeUpdatedAt = createdTask.updatedAt;
  const createdAt = createdTask.createdAt;
  // 5) Update: reassign to second member and modify fields
  const updatedDueDate = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 20,
  ).toISOString();
  const updatedTitle = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedPriority = "high";
  const updatedEstimatedHours = 5;
  const updatePayload: IErpHrmTimeTrackingTask.IUpdate = {
    title: updatedTitle,
    description: updatedDescription,
    status: "in_progress",
    priority: updatedPriority,
    estimated_hours: updatedEstimatedHours,
    due_date: updatedDueDate,
    assigned_employee_id: secondMembership.employee_id,
  };
  const updatedTask =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.updateTask(
      projectLeadConnection,
      {
        projectId: project.id,
        taskId: createdTask.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedTask);
  // 6) Validate response echoes updated values
  TestValidator.equals("task id unchanged", updatedTask.id, createdTask.id);
  TestValidator.equals("title updated", updatedTask.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    updatedDescription,
  );
  TestValidator.equals(
    "status updated",
    updatedTask.status,
    updatePayload.status,
  );
  TestValidator.equals(
    "priority updated",
    updatedTask.priority,
    updatePayload.priority,
  );
  TestValidator.equals(
    "estimated hours updated",
    updatedTask.estimatedHours,
    updatedEstimatedHours,
  );
  TestValidator.equals("due date updated", updatedTask.dueDate, updatedDueDate);
  TestValidator.equals(
    "assigned member updated",
    updatedTask.assignedEmployee?.id ?? null,
    secondMembership.employee_id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedTask.createdAt,
    createdAt,
  );
  TestValidator.predicate(
    "updated_at advanced",
    updatedTask.updatedAt > beforeUpdatedAt,
  );
}
