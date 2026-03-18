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

export async function test_api_task_create_success_and_parent_and_assignment_rules(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "http://example.com",
      referrer: "http://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: join.token.access,
  };
  // Scenario A
  const projectA =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authorizedConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color: "#1abc9c",
          status: "active",
        },
      },
    );
  typia.assert(projectA);
  const membershipA =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      authorizedConnection,
      {
        params: {
          projectId: projectA.id,
        },
        body: {
          membership_role: "member",
        },
      },
    );
  typia.assert(membershipA);
  const assignedEmployeeIdA = membershipA.employee_id;
  const dueDateA = RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 7);
  const taskA =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authorizedConnection,
      {
        params: {
          projectId: projectA.id,
        },
        body: {
          title: RandomGenerator.name(4),
          status: "open",
          priority: "normal",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          estimated_hours: 2.5,
          due_date: dueDateA.toISOString(),
          parent_task_id: null,
          assigned_employee_id: assignedEmployeeIdA,
        },
      },
    );
  typia.assert(taskA);
  TestValidator.equals(
    "taskA.project.id matches projectId",
    taskA.project.id,
    projectA.id,
  );
  TestValidator.predicate(
    "taskA.assignedEmployee is non-null",
    taskA.assignedEmployee !== null,
  );
  TestValidator.equals(
    "taskA.assignedEmployee.id matches assigned employee id",
    taskA.assignedEmployee?.id,
    assignedEmployeeIdA,
  );
  TestValidator.equals("taskA.parentTask is null", taskA.parentTask, null);
  TestValidator.equals("taskA.deletedAt is null", taskA.deletedAt, null);
  TestValidator.predicate(
    "taskA.createdAt is parseable ISO date-time",
    () => !Number.isNaN(new Date(taskA.createdAt).getTime()),
  );
  TestValidator.predicate(
    "taskA.updatedAt is parseable ISO date-time",
    () => !Number.isNaN(new Date(taskA.updatedAt).getTime()),
  );
  // Scenario B
  const projectB =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      authorizedConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color: "#3498db",
          status: "active",
        },
      },
    );
  typia.assert(projectB);
  const membershipB =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      authorizedConnection,
      {
        params: {
          projectId: projectB.id,
        },
        body: {
          membership_role: "member",
        },
      },
    );
  typia.assert(membershipB);
  const assignedEmployeeIdB = membershipB.employee_id;
  const rootTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authorizedConnection,
      {
        params: {
          projectId: projectB.id,
        },
        body: {
          title: RandomGenerator.name(5),
          status: "open",
          priority: "normal",
          parent_task_id: null,
          assigned_employee_id: assignedEmployeeIdB,
        },
      },
    );
  typia.assert(rootTask);
  const childTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      authorizedConnection,
      {
        params: {
          projectId: projectB.id,
        },
        body: {
          title: RandomGenerator.name(5),
          status: "open",
          priority: "normal",
          parent_task_id: rootTask.id,
          assigned_employee_id: assignedEmployeeIdB,
        },
      },
    );
  typia.assert(childTask);
  TestValidator.predicate(
    "childTask.parentTask is non-null",
    childTask.parentTask !== null,
  );
  TestValidator.equals(
    "childTask.parentTask.id matches root task id",
    childTask.parentTask?.id,
    rootTask.id,
  );
  TestValidator.equals(
    "childTask.parentTask.project.id matches projectId",
    childTask.parentTask?.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "rootTask.parentTask is null",
    rootTask.parentTask,
    null,
  );
  TestValidator.equals(
    "childTask.deletedAt is null",
    childTask.deletedAt,
    null,
  );
}
