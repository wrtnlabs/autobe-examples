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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that submitting an empty timesheet (with no timelogs) is blocked by the system.
 *
 * According to business rule validation (section 454/477), timesheets must contain
 * at least one timelog before submission. The system queries the erp_hrm_timelogs
 * table for entries where timesheetId equals the target timesheet, finds none,
 * and rejects the submission request.
 */
export async function test_api_timesheet_submit_empty_timesheet_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for employee
  const employeeConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as employee
  const member = await authorize_member_join(employeeConnection, {});
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      employeeConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {
      body: {
        permissions: [],
      },
    },
  );
  typia.assert(role);
  // 4. Create organization member linking user to organization
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(orgMember);
  // 5. Create empty draft timesheet (no timelogs)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 6. Verify timesheet is in draft status and has no timelogs
  TestValidator.equals(
    "timesheet status should be draft",
    timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet should have no timelogs",
    timesheet.timelogs.length,
    0,
  );
  // 7. Attempt to submit empty timesheet - should fail with error
  await TestValidator.error(
    "empty timesheet submission should be blocked",
    async () => {
      await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
}
