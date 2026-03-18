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

export async function test_api_task_create_one_level_parent_and_sibling_independence(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const joinOutput = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password-123!",
        organizationName: RandomGenerator.name(),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationLogoUrl: null,
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/join",
        referrer: "https://example.com/referrer",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = joinOutput.token.access;
  // 2) Create an active project
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 3) Create membership for an eligible employee
  const membership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  const taskStatus = typia.random<string>();
  const taskPriority = typia.random<string>();
  // 4) Root task (no parent)
  const rootTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `Root Task ${RandomGenerator.alphabets(6)}`,
          description: null,
          status: taskStatus,
          priority: taskPriority,
          parent_task_id: null,
          assigned_employee_id: membership.employee_id,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(rootTask);
  // 5) Child task
  const childTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `Child Task ${RandomGenerator.alphabets(6)}`,
          description: null,
          status: taskStatus,
          priority: taskPriority,
          parent_task_id: rootTask.id,
          assigned_employee_id: membership.employee_id,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(childTask);
  // 6) Sibling top-level task (no parent)
  const siblingTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `Sibling Task ${RandomGenerator.alphabets(6)}`,
          description: null,
          status: taskStatus,
          priority: taskPriority,
          parent_task_id: null,
          assigned_employee_id: membership.employee_id,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(siblingTask);
  TestValidator.predicate(
    "child parentTask is not null",
    childTask.parentTask !== null,
  );
  TestValidator.equals(
    "child parentTask.id equals root task id",
    childTask.parentTask?.id,
    rootTask.id,
  );
  TestValidator.equals(
    "sibling parentTask is null",
    siblingTask.parentTask,
    null,
  );
  TestValidator.equals("root task deletedAt is null", rootTask.deletedAt, null);
  TestValidator.equals(
    "child task deletedAt is null",
    childTask.deletedAt,
    null,
  );
  TestValidator.equals(
    "sibling task deletedAt is null",
    siblingTask.deletedAt,
    null,
  );
}
