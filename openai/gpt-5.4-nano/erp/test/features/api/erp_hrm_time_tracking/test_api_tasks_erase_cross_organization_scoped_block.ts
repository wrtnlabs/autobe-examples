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

export async function test_api_tasks_erase_cross_organization_scoped_block(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A joins (org A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password-1234!",
        organizationName: RandomGenerator.name(),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationLogoUrl: null,
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  // 2) Project A + Task A
  const projectA: IErpHrmTimeTrackingProject =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {
        body: {
          name: `Project-A-${memberA.id}`,
          color: "#123456",
          status: typia.random<string>(),
        },
      },
    );
  typia.assert(projectA);
  const taskA: IErpHrmTimeTrackingTask =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberAConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `Task-A-${memberA.id}`,
          description: null,
          status: typia.random<string>(),
          priority: typia.random<string>(),
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        },
      },
    );
  typia.assert(taskA);
  // 3) Member B joins (org B)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 4) Initialize independent org context by creating Project B
  await generate_random_erp_hrm_time_tracking_member_projects_create(
    memberBConnection,
    {
      body: {
        name: `Project-B-${memberA.id}`,
        color: "#654321",
        status: typia.random<string>(),
      },
    },
  );
  // 5) Cross-org erase attempt must be rejected
  await TestValidator.error(
    "cross-organization erase should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.projects.tasks.erase(
        memberBConnection,
        {
          projectId: projectA.id,
          taskId: taskA.id,
        },
      );
    },
  );
  // 6) Member A can still erase Task A
  await api.functional.erpHrmTimeTracking.member.projects.tasks.erase(
    memberAConnection,
    {
      projectId: projectA.id,
      taskId: taskA.id,
    },
  );
}
