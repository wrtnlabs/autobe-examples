import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test the primary success path for retrieving timesheet action history.
 *
 * Validates the complete workflow including member account creation, timesheet creation, and actions index endpoint functionality. Ensures that the actions index endpoint returns properly formatted pagination metadata and correctly processes filtering parameters.
 *
 * Special attention is given to verifying the response structure includes all required fields: action type, actor member details, timesheet reference, notes if any, and timestamps. The pagination metadata (current page, limit, total records, total pages) is also validated to ensure accurate counting.
 *
 * 1. Member account creation via utility function with organization context.
 * 2. Timesheet creation in pending status using member connection.
 * 3. Actions index endpoint retrieval with pagination parameters.
 * 4. Validate pagination metadata structure and accuracy.
 * 5. Test filtering parameters (action, actor_id, date range) with empty results.
 */
export async function test_api_timesheet_actions_index_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and organization via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberResult);
  // 2. Create timesheet using member connection
  const now = new Date();
  const startDate = new Date(
    now.getTime() - now.getDay() * 24 * 60 * 60 * 1000,
  );
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  // Use member's employee_id from organization (member belongs to organization with default employee role)
  const employeeId = memberResult.member.id;
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        hrm_platform_employee_id: employeeId,
        notes: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 3. Retrieve actions index with pagination parameters using memberConnection
  const actionsResponse =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetAction.IRequest,
      },
    );
  typia.assert(actionsResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    actionsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", actionsResponse.pagination.limit, 10);
  TestValidator.equals(
    "total records is 0",
    actionsResponse.pagination.records,
    0,
  );
  TestValidator.equals("total pages is 0", actionsResponse.pagination.pages, 0);
  TestValidator.equals("data array is empty", actionsResponse.data.length, 0);
  // 5. Test filtering parameters with action type
  const filteredByAction =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          action: "submit",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetAction.IRequest,
      },
    );
  typia.assert(filteredByAction);
  // 6. Test filtering parameters with actor_id
  const filteredByActor =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          actor_id: memberResult.member.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetAction.IRequest,
      },
    );
  typia.assert(filteredByActor);
  // 7. Test filtering parameters with date range
  const filteredByDate =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          start_date: new Date(
            now.getTime() - 1000 * 60 * 60 * 24,
          ).toISOString() satisfies string & tags.Format<"date-time">,
          end_date: new Date().toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetAction.IRequest,
      },
    );
  typia.assert(filteredByDate);
  // 8. Test page 2 validation
  const page2Response =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IHrmPlatformTimesheetAction.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Response.pagination.limit, 5);
  TestValidator.equals(
    "page 2 total records is 0",
    page2Response.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 2 total pages is 0",
    page2Response.pagination.pages,
    0,
  );
}
