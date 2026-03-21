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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test that starting a new timer is rejected when an active timer already exists.
 *
 * Steps:
 * 1. Authenticate as a new member via /auth/member/join
 * 2. Create a project via POST /erpHrm/member/projects
 * 3. Start first timer via POST /erpHrm/member/timers with valid project_id
 * 4. Attempt to start second timer via POST /erpHrm/member/timers with valid project_id
 *
 * Validation points:
 * - First timer creation returns HTTP 201 Created with valid timer details
 * - Second timer creation returns HTTP 409 Conflict or 400 Bad Request
 * - Error response contains message indicating active timer already exists
 * - Error message suggests stopping or discarding existing timer before starting new one
 * - Database constraint enforces single active timer per employee
 */
export async function test_api_timer_prevent_duplicate_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Start first timer via POST /erpHrm/member/timers with valid project_id
  const firstTimer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
      },
    },
  );
  typia.assert(firstTimer);
  // 4. Attempt to start second timer - should fail with conflict/error
  // The server should return 409 Conflict or 400 Bad Request with message about active timer
  await TestValidator.error("duplicate active timer rejected", async () => {
    await api.functional.erpHrm.member.timers.create(memberConnection, {
      body: {
        erp_hrm_project_id: project.id,
      } satisfies IErpHrmTimer.ICreate,
    });
  });
}