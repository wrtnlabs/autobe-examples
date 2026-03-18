import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_organization_deletion_blocked_by_unresolved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account — becomes organization owner
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (member becomes owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // Step 3: Switch context to the new organization
  const orgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(orgMember);
  // Step 4: Create a timesheet in 'draft' status — intentionally left unresolved
  // weekStartDate must be a Monday, weekEndDate must be 6 days later (Sunday)
  // Using 2026-03-16 (Monday) as weekStartDate and 2026-03-22 (Sunday) as weekEndDate
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: "2026-03-16T00:00:00.000Z",
        weekEndDate: "2026-03-22T00:00:00.000Z",
      },
    },
  );
  typia.assert(timesheet);
  // Verify the timesheet is in draft status (blocking deletion)
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // Step 5: Attempt to delete the organization — should be rejected with 422
  // because the timesheet is in 'draft' status (unresolved)
  await TestValidator.httpError(
    "organization deletion blocked by draft timesheet",
    422,
    async () => {
      await api.functional.erpHrm.member.organizations.erase(memberConnection, {
        organizationId,
      });
    },
  );
}
