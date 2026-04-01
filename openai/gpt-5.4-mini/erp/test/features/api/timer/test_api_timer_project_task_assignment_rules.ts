import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_timers_start_create } from "../../../generate/generate_random_erp_hrm_time_member_timers_start_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_timer } from "../../../prepare/prepare_random_erp_hrm_time_timer";

export async function test_api_timer_project_task_assignment_rules(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` as string,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const firstProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#3366FF",
          status: "active",
          budgetHours: null,
          startDate: new Date().toISOString(),
          endDate: null,
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(firstProject);
  const runningTimer =
    await generate_random_erp_hrm_time_member_timers_start_create(
      memberConnection,
      {
        body: {
          project_id: firstProject.id,
          description: "Initial timer context",
        } satisfies IErpHrmTimeTimer.ICreate,
      },
    );
  typia.assert(runningTimer);
  const originalProjectId = runningTimer.project.id;
  const originalDescription = runningTimer.description;
  const secondProject =
    await generate_random_erp_hrm_time_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Project ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#FF6633",
          status: "active",
          budgetHours: null,
          startDate: new Date().toISOString(),
          endDate: null,
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(secondProject);
  await TestValidator.error(
    "running timer should reject switching to a different project context",
    async () => {
      await api.functional.erpHrmTime.member.timers.putByTimerid(
        memberConnection,
        {
          timerId: runningTimer.id,
          body: {
            project_id: secondProject.id,
            description: "Trying to move timer to another project",
          } satisfies IErpHrmTimeTimer.IUpdate,
        },
      );
    },
  );
  const afterDescriptionUpdate =
    await api.functional.erpHrmTime.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: runningTimer.id,
        body: {
          project_id: firstProject.id,
          description: "Updated description only",
        } satisfies IErpHrmTimeTimer.IUpdate,
      },
    );
  typia.assert(afterDescriptionUpdate);
  TestValidator.equals(
    "timer should remain on the original project after failed cross-project update",
    afterDescriptionUpdate.project.id,
    originalProjectId,
  );
  TestValidator.equals(
    "timer description should update successfully",
    afterDescriptionUpdate.description,
    "Updated description only",
  );
  TestValidator.notEquals(
    "timer description should change from its original value",
    afterDescriptionUpdate.description,
    originalDescription,
  );
}
