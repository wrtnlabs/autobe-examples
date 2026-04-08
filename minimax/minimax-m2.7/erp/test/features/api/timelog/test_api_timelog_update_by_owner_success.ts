import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates organization by joining
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a project (response is budget report, not entity with id)
  await generate_random_erp_hrm_admin_projects_create(adminConnection, {});
  // 3. Admin creates a task (response is analytics, not entity with id)
  await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
    params: { projectId: typia.random<string & tags.Format<"uuid">>() },
  });
  // 4. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 5. Set organization context for member using prepare function
  const orgContext = prepare_random_erp_hrm_organization_context({});
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    { body: { organizationId: orgContext.organizationId } },
  );
  // 6. Member creates an initial timelog using prepare function
  const timelogInput = prepare_random_erp_hrm_timelog({});
  const initialTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: timelogInput },
  );
  // 7. Generate updated values
  const updatedDate = new Date().toISOString();
  const updatedDurationMinutes = 120;
  const updatedDescription = "Updated work description";
  const updatedBillable = true;
  // 8. Member updates their own timelog
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: initialTimelog.id,
      body: {
        date: updatedDate,
        durationMinutes: updatedDurationMinutes,
        description: updatedDescription,
        billable: updatedBillable,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  // 9. Validate response with typia
  typia.assert(updatedTimelog);
  // 10. Validate business logic - values that were updated
  TestValidator.equals(
    "duration updated to 120 minutes",
    updatedTimelog.durationMinutes,
    updatedDurationMinutes,
  );
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    updatedDescription,
  );
  TestValidator.equals(
    "billable matches updated value",
    updatedTimelog.billable,
    updatedBillable,
  );
  // 11. Validate values that should remain unchanged
  TestValidator.equals(
    "employee unchanged",
    updatedTimelog.employee.id,
    initialTimelog.employee.id,
  );
}
