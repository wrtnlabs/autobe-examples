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
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_submission_rejected_when_empty(
  connection: api.IConnection,
): Promise<void> {
  // Generate a known password for the member
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Admin creates organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  const adminTokenConnection: api.IConnection = { host: connection.host };
  adminTokenConnection.headers ??= {};
  adminTokenConnection.headers.Authorization = adminAuth.token.access;
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminTokenConnection,
    {},
  );
  // 2. Member joins with known password
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      password: memberPassword,
    },
  });
  // 3. Member logs in with the same password
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.ILogin,
  });
  // 4. Set organization context for the member
  const orgContextConnection: api.IConnection = {
    host: memberLoginConnection.host,
  };
  orgContextConnection.headers ??= {};
  orgContextConnection.headers.Authorization =
    memberLoginConnection.headers?.Authorization ?? "";
  await generate_random_erp_hrm_member_organization_context_select(
    orgContextConnection,
    {
      body: {
        organizationId: organization.id,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 5. Create draft timesheet for current week (will be empty since no timelogs exist)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const timesheetConnection: api.IConnection = {
    host: orgContextConnection.host,
  };
  timesheetConnection.headers ??= {};
  timesheetConnection.headers.Authorization =
    orgContextConnection.headers?.Authorization ?? "";
  const draftTimesheet = await generate_random_erp_hrm_member_timesheets_create(
    timesheetConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(draftTimesheet);
  // 6. Verify the draft timesheet is empty and in draft status
  TestValidator.equals(
    "timesheet has no timelogs",
    draftTimesheet.timesheetTimelogs.length,
    0,
  );
  TestValidator.equals(
    "timesheet is in draft status",
    draftTimesheet.status,
    "draft",
  );
  // 7. Attempt to submit empty timesheet via PUT update with status="submitted"
  // This should fail because the timesheet has no timelogs
  const updateConnection: api.IConnection = { host: timesheetConnection.host };
  updateConnection.headers ??= {};
  updateConnection.headers.Authorization =
    timesheetConnection.headers?.Authorization ?? "";
  await TestValidator.error(
    "submission rejected when timesheet is empty",
    async () => {
      await api.functional.erpHrm.member.timesheets.update(updateConnection, {
        timesheetId: draftTimesheet.id,
        body: {
          status: "submitted",
        } satisfies IErpHrmTimesheet.IUpdate,
      });
    },
  );
}