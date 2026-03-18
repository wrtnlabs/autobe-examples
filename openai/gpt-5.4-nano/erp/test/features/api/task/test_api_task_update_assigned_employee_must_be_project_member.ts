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

export async function test_api_task_update_assigned_employee_must_be_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member user with task edit authority
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(6),
      referrer: "https://ref.example.com/" + RandomGenerator.alphabets(6),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member1Authorized);
  // Create an active project (status: non-empty string)
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.name(2),
          color: "#" + RandomGenerator.alphabets(6),
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 2) Create membership for caller so they can edit tasks
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    member1Connection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: member1Authorized.id,
        membership_role: RandomGenerator.alphabets(8) satisfies string,
      },
    },
  );
  // 3) Create a task within this project
  const originalTitle = RandomGenerator.name(3);
  const task =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      member1Connection,
      {
        params: { projectId: project.id },
        body: {
          title: originalTitle,
          description: null,
          status: "open",
          priority: "normal",
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(task);
  // 4) Join another employee that is NOT a project member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/" + RandomGenerator.alphabets(6),
      referrer: "https://ref.example.com/" + RandomGenerator.alphabets(6),
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member2Authorized);
  // 5) Attempt to assign the task to the non-member employee (must be rejected)
  await TestValidator.error(
    "assigned employee must be a project member",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.tasks.updateTask(
        member1Connection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            assigned_employee_id: member2Authorized.id,
          } satisfies IErpHrmTimeTrackingTask.IUpdate,
        },
      );
    },
  );
  // 6) Validate atomicity: change title only; assignee must remain null
  const updatedTitle = RandomGenerator.name(4);
  const afterTitleUpdate =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.updateTask(
      member1Connection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { title: updatedTitle } satisfies IErpHrmTimeTrackingTask.IUpdate,
      },
    );
  typia.assert(afterTitleUpdate);
  TestValidator.equals(
    "title unchanged after rejected assignment",
    afterTitleUpdate.title,
    updatedTitle,
  );
  TestValidator.equals(
    "assignee remains null after rejected assignment",
    afterTitleUpdate.assignedEmployee,
    null,
  );
}
