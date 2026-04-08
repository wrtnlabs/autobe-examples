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
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_project_change_clears_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 2. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 3. Set organization context (member needs to be in the org)
  // The member join process should handle org association
  await api.functional.erpHrm.member.organization_context.select(
    memberConnection,
    {
      body: {
        organizationId: memberAuth.token.access as any,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 4. Create first project
  const firstProject = await generate_random_erp_hrm_admin_projects_create(
    memberConnection,
    {},
  );
  // 5. Create second project
  const secondProject = await generate_random_erp_hrm_admin_projects_create(
    memberConnection,
    {},
  );
  // 6. Start timer with first project
  const firstTimer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erpHrmProjectId: (firstProject as unknown as { id: string }).id,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(firstTimer);
  // 7. Update timer to switch to second project via PUT /member/timers
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      body: {
        project_id: (secondProject as unknown as { id: string }).id,
      } satisfies IErpHrmTimer.IUpdate,
    },
  );
  // 8. Verify response is valid
  typia.assert(updatedTimer);
  // 9. Verify task is cleared (null) since it didn't belong to the new project
  TestValidator.equals(
    "task cleared after project change",
    updatedTimer.task,
    null,
  );
  TestValidator.equals(
    "project changed to second project",
    updatedTimer.project.id,
    (secondProject as unknown as { id: string }).id,
  );
  TestValidator.predicate(
    "start timestamp preserved",
    updatedTimer.startedAt === firstTimer.startedAt,
  );
}