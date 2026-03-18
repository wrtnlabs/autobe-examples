import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheets_list_employee_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: undefined },
  );
  typia.assert(member);
  // 2. Get organization from member's organization membership
  const organizationId =
    member.organization_memberships[0]?.organization.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 3. Get a week date range for timesheet creation
  const weekStartDate = new Date().toISOString().slice(0, 10);
  const weekEndDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  // 4. Create draft timesheet for the week
  const timesheetCreate: IHrmsTimesheet.ICreate = {
    week_start_date: `${weekStartDate}T00:00:00Z`,
  } satisfies IHrmsTimesheet.ICreate;
  const createdTimesheet: IHrmsTimesheet =
    await api.functional.hrms.member.timesheets.create(memberConnection, {
      body: timesheetCreate,
    });
  typia.assert(createdTimesheet);
  // 5. List timesheets with date range filter
  const listResponse: IPageIHrmsTimesheet.ISummary =
    await api.functional.hrms.member.timesheets.index(memberConnection, {
      body: {
        organization_id: organizationId,
        start_date: weekStartDate,
        end_date: weekEndDate,
      } satisfies IHrmsTimesheet.IRequest,
    });
  typia.assert(listResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", listResponse.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    listResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count",
    listResponse.pagination.pages,
    1,
  );
  // 7. Validate timesheets count
  TestValidator.equals("timesheets count", listResponse.data.length, 1);
  // Note: The response data uses IHrmsTimesheet.ISummary (budget analytics type),
  // which does not include employee details. Validation is done via created timesheet.
  // The created timesheet's employee ID should match the authenticated member's employee
  TestValidator.equals(
    "timesheet employee matches authenticated member",
    createdTimesheet.employee.id,
    member.organization_memberships[0]?.member.id,
  );
  TestValidator.equals(
    "timesheet employee display name matches",
    createdTimesheet.employee.display_name,
    member.organization_memberships[0]?.member.display_name,
  );
  // 8. Validate timesheet entity data
  TestValidator.equals(
    "timesheet status is draft",
    createdTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet total hours",
    createdTimesheet.total_hours,
    0,
  );
  TestValidator.equals(
    "timesheet week_start_date",
    createdTimesheet.week_start_date,
    timesheetCreate.week_start_date,
  );
  TestValidator.equals(
    "timesheet week_end_date",
    createdTimesheet.week_end_date,
    createdTimesheet.week_end_date,
  );
}
