import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
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
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test that a member cannot access dashboard of an organization they do not belong to.
 *
 * Steps:
 * 1. Create first authenticated member via member join
 * 2. Create a project with first member to establish organization context
 * 3. Create second authenticated member via member join (different user)
 * 4. Attempt to retrieve dashboard using organizationId from first member's organization with second member's session
 *
 * Validation:
 * System should reject the request with 403 Forbidden or similar unauthorized error,
 * enforcing organization data isolation. The response should indicate the user does not
 * have permission to view this organization's dashboard.
 */
export async function test_api_dashboard_access_denied_for_unauthorized_organization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first authenticated member via member join
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {});
  // Step 2: Create a project with first member to establish organization context
  const project = await generate_random_erp_hrm_member_projects_create(
    firstMemberConnection,
    {},
  );
  // Extract organizationId from the created project
  const organizationId = project.organization.id;
  // Step 3: Create second authenticated member via member join (different user)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // Step 4: Attempt to retrieve dashboard using organizationId from first member's
  // organization with second member's session
  // Validation: System should reject the request with 403 Forbidden or similar unauthorized error
  await TestValidator.httpError(
    "unauthorized organization dashboard access",
    403,
    async () =>
      await api.functional.erpHrm.member.organizations.dashboard.at(
        secondMemberConnection,
        {
          organizationId: organizationId,
        },
      ),
  );
}
