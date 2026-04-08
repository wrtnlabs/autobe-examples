import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_discard_other_employee_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin to create organization context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 3. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 4. Admin creates a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  // Extract project ID from the budget report response (IErpHrmProject contains items with projectId)
  const projectId = project.items[0].projectId;
  // 5. Admin assigns member A to the project
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: projectId },
    body: { employeeId: memberA.id },
  });
  // 6. Admin assigns member B to the project
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: projectId },
    body: { employeeId: memberB.id },
  });
  // 7. Member A starts a timer
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberAConnection,
    {
      body: { erpHrmProjectId: projectId },
    },
  );
  // 8. Member B attempts to discard member A's timer
  // Validation: Should return 404 Not Found (privacy protection - system must not reveal existence of other employees' timers)
  await TestValidator.httpError(
    "member B cannot discard member A's timer - returns 404 for privacy",
    404,
    async () => {
      await api.functional.erpHrm.member.timers.erase(memberBConnection, {
        timerId: timer.id,
      });
    },
  );
  // 9. Verify member A's timer remains active (can be retrieved)
  // Since there's no direct "get timer" endpoint documented, we verify by attempting to create another timer
  // Member A should still have their original timer active and cannot start a new one
  await TestValidator.httpError(
    "member A still has active timer - cannot start another",
    409,
    async () => {
      await generate_random_erp_hrm_member_timers_create(memberAConnection, {
        body: { erpHrmProjectId: projectId },
      });
    },
  );
}
