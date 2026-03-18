import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
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
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";

export async function test_api_tasks_erase_unauthorized_member_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword-" + RandomGenerator.alphabets(10),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/attach/a" + RandomGenerator.alphabets(6),
    referrer: "https://example.com/ref/a" + RandomGenerator.alphabets(6),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberAConnection, {
    body: memberAPayload,
  });
  // 2) Register member B (attempt to land in the same organization context)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword-" + RandomGenerator.alphabets(10),
    organizationName: memberAPayload.organizationName,
    organizationDescription: memberAPayload.organizationDescription,
    organizationCurrencyCode: memberAPayload.organizationCurrencyCode,
    organizationTimezone: memberAPayload.organizationTimezone,
    organizationFiscalStartMonth: memberAPayload.organizationFiscalStartMonth,
    href: "https://example.com/attach/b" + RandomGenerator.alphabets(6),
    referrer: "https://example.com/ref/b" + RandomGenerator.alphabets(6),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberBConnection, {
    body: memberBPayload,
  });
  // 3) Create a project with member A
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#" + RandomGenerator.alphabets(6),
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // 4) Create a task in the project with member A
  const task =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: null,
          status: "active",
          priority: "medium",
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task);
  // 5) Attempt to erase the task using member B (should be blocked)
  await TestValidator.error(
    "unauthorized member cannot erase task",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.tasks.erase(
        memberBConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
  // 6) Verify task still exists by ensuring member A can still erase it
  await api.functional.erpHrmTimeTracking.member.projects.tasks.erase(
    memberAConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
}
