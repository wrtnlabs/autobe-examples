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

export async function test_api_timer_start_single_active_timer_and_employee_status(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const firstTimer =
    await generate_random_erp_hrm_time_member_timers_start_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeTimer.ICreate,
      },
    );
  typia.assert(firstTimer);
  TestValidator.equals(
    "timer project matches",
    firstTimer.project.id,
    project.id,
  );
  TestValidator.equals("timer is active", firstTimer.deletedAt, null);
  await TestValidator.error(
    "starting a second active timer should be rejected",
    async () => {
      await generate_random_erp_hrm_time_member_timers_start_create(
        memberConnection,
        {
          body: {
            project_id: project.id,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeTimer.ICreate,
        },
      );
    },
  );
  const deactivatedConnection: api.IConnection = { host: connection.host };
  const deactivatedMember = await authorize_member_join(deactivatedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(deactivatedMember);
  const deactivatedProject =
    await generate_random_erp_hrm_time_member_projects_create(
      deactivatedConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
          budgetHours: null,
          startDate: null,
          endDate: null,
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(deactivatedProject);
  await TestValidator.error(
    "deactivated employee should not be able to start a timer",
    async () => {
      await generate_random_erp_hrm_time_member_timers_start_create(
        deactivatedConnection,
        {
          body: {
            project_id: deactivatedProject.id,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTimeTimer.ICreate,
        },
      );
    },
  );
}
