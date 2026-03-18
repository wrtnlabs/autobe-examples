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
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";

export async function test_api_project_task_tree_visibility_project_membership_drives_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const projectX =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project X ${RandomGenerator.alphabets(8)}`,
          color: "#1A2B3C",
          status: typia.random<string>(),
        },
      },
    );
  typia.assert(projectX);
  const projectY =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project Y ${RandomGenerator.alphabets(8)}`,
          color: "#3C2B1A",
          status: typia.random<string>(),
        },
      },
    );
  typia.assert(projectY);
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    memberConnection,
    {
      params: { projectId: projectX.id },
      body: {
        employee_id: authorized.id,
        membership_role: "member",
      },
    },
  );
  const taskTreeX =
    await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
      memberConnection,
      {
        projectId: projectX.id,
        body: {} satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(taskTreeX);
  TestValidator.equals(
    "task belongs to project X",
    taskTreeX.project.id,
    projectX.id,
  );
  if (taskTreeX.parentTask !== null) {
    TestValidator.equals(
      "parent task also belongs to project X",
      taskTreeX.parentTask.project.id,
      projectX.id,
    );
  }
  await TestValidator.httpError(
    "task tree access denied for project without membership",
    [403, 404],
    async () => {
      const taskTreeY =
        await api.functional.erpHrmTimeTracking.member.projects.taskTree.buildTaskTree(
          memberConnection,
          {
            projectId: projectY.id,
            body: {} satisfies IErpHrmTimeTrackingTask.IRequest,
          },
        );
      typia.assert(taskTreeY);
    },
  );
}
