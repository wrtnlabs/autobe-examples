import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
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
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_timers_create } from "../../../generate/generate_random_hrms_member_timers_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheets_employee_own_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account and establish authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization membership for the member
  const organizationMember =
    await generate_random_hrms_member_organization_members_create(
      memberConnection,
      {
        body: {
          hrms_member_id: memberAuth.id,
        },
      },
    );
  typia.assert(organizationMember);
  // 3. Create 3 draft timesheets for specific weeks
  const week1Monday = new Date("2024-01-08T00:00:00Z");
  const week2Monday = new Date("2024-01-15T00:00:00Z");
  const week3Monday = new Date("2024-01-22T00:00:00Z");
  const timesheets: IHrmsTimesheet[] = [];
  for (const weekMonday of [week1Monday, week2Monday, week3Monday]) {
    const timesheet = await generate_random_hrms_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekMonday.toISOString(),
        },
      },
    );
    typia.assert(timesheet);
    timesheets.push(timesheet);
  }
  // 4. Call timesheets analytics endpoint with date range covering all timesheets
  const analyticsResponse =
    await api.functional.hrms.member.timesheets.analytics(memberConnection, {
      body: {
        organization_id: organizationMember.organization.id,
        start_date: "2024-01-08",
        end_date: "2024-01-22",
      } satisfies IHrmsTimesheet.IRequest,
    });
  typia.assert(analyticsResponse);
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    analyticsResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records matches timesheets count",
    analyticsResponse.pagination.records,
    timesheets.length,
  );
  TestValidator.predicate(
    "pagination pages at least 1",
    analyticsResponse.pagination.pages >= 1,
  );
  // 6. Validate timesheet data in response
  const timesheetSummaries: IHrmsTimesheet.ISummary[] =
    analyticsResponse.data.map((item) =>
      typia.assert<IHrmsTimesheet.ISummary>(item),
    );
  TestValidator.equals(
    "timesheet count in data",
    timesheetSummaries.length,
    timesheets.length,
  );
  // 7. Validate timesheet summary structure (has project_id and metrics)
  for (const timesheetSummary of timesheetSummaries) {
    typia.assert(timesheetSummary);
    TestValidator.predicate(
      "has project_id",
      timesheetSummary.project_id !== undefined,
    );
    TestValidator.predicate(
      "has project_name",
      timesheetSummary.project_name !== undefined,
    );
    TestValidator.predicate(
      "has budget_hours",
      timesheetSummary.budget_hours !== undefined,
    );
  }
}
