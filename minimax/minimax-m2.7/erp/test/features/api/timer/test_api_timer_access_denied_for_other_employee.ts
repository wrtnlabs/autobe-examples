import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_access_denied_for_other_employee(
  connection: api.IConnection,
): Promise<void> {
  // Test that an employee cannot retrieve another employee's timer.
  // This validates the timer privacy rule.
  // Step 1: Authenticate as first member and create project
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  const firstProject = await generate_random_erp_hrm_member_projects_create(
    firstMemberConnection,
    {},
  );
  // Step 2: Start a timer as first member
  const firstTimer = await generate_random_erp_hrm_member_timers_create(
    firstMemberConnection,
    {
      body: {
        erp_hrm_project_id: firstProject.id,
      },
    },
  );
  // Step 3: Authenticate as second member (separate join call)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // Step 4: Attempt to retrieve the first member's timer - should be denied
  await TestValidator.httpError(
    "other employee cannot access timer",
    403,
    async () =>
      await api.functional.erpHrm.member.timers.at(secondMemberConnection, {
        timerId: firstTimer.id,
      }),
  );
}
