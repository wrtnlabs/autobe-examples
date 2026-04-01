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

export async function test_api_timer_running_context_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectA = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Alpha ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 40,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Beta ${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#ff6633",
        status: "active",
        budgetHours: 24,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(projectB);
  const timer = await generate_random_erp_hrm_time_member_timers_start_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        description: "initial work context",
      } satisfies IErpHrmTimeTimer.ICreate,
    },
  );
  typia.assert(timer);
  TestValidator.equals(
    "timer starts on original project",
    timer.project.id,
    projectA.id,
  );
  TestValidator.equals("timer starts as running", timer.deletedAt, null);
  TestValidator.equals(
    "timer starts with initial description",
    timer.description,
    "initial work context",
  );
  TestValidator.equals("timer starts without task", timer.task, null);
  const updatedDescription = `updated context ${RandomGenerator.alphabets(5)}`;
  const updatedTimer =
    await api.functional.erpHrmTime.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          project_id: projectB.id,
          description: updatedDescription,
        } satisfies IErpHrmTimeTimer.IUpdate,
      },
    );
  typia.assert(updatedTimer);
  TestValidator.equals("updated timer id preserved", updatedTimer.id, timer.id);
  TestValidator.equals(
    "updated timer remains active",
    updatedTimer.deletedAt,
    null,
  );
  TestValidator.equals(
    "updated timer project changed",
    updatedTimer.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "updated timer description changed",
    updatedTimer.description,
    updatedDescription,
  );
  TestValidator.equals("task remains unselected", updatedTimer.task, null);
  TestValidator.notEquals(
    "project context changed",
    updatedTimer.project.id,
    projectA.id,
  );
}
