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
import { generate_random_erp_hrm_member_timers_start } from "../../../generate/generate_random_erp_hrm_member_timers_start";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_start_with_existing_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // Test single active timer constraint - attempting to start a second timer when one is already running.
  // 1. Authenticate as a member via POST /erpHrm/auth/member/join
  // 2. Create a project via POST /erpHrm/member/projects
  // 3. Start first timer via POST /erpHrm/member/timers/start with the project ID
  // 4. Attempt to start second timer via POST /erpHrm/member/timers/start - should be rejected with 409 Conflict
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project for timer association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 3. Start first timer successfully
  const firstTimer = await generate_random_erp_hrm_member_timers_start(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(firstTimer);
  // 4. Attempt to start second timer - should be rejected with 409 Conflict
  await TestValidator.httpError(
    "Second timer should be rejected when active timer exists",
    409,
    async () => {
      await generate_random_erp_hrm_member_timers_start(memberConnection, {
        body: {
          erp_hrm_project_id: project.id,
        } satisfies IErpHrmTimer.ICreate,
      });
    },
  );
}
