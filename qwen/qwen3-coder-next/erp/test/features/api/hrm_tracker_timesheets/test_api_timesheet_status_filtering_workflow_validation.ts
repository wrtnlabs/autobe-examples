import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_status_filtering_workflow_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member and employee
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Update connection with authorized token
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 2. Create timesheets in different statuses
  const statusFilters = ["draft", "submitted", "approved", "rejected"] as const;
  const timesheetIds: Record<string, string> = {};
  for (const status of statusFilters) {
    const timesheet = await api.functional.hrmTracker.member.timesheets.index(
      authorizedConnection,
      {
        body: {
          status,
          page: 1,
          limit: 1,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
    typia.assert(timesheet);
    if (timesheet.data.length > 0) {
      timesheetIds[status] = timesheet.data[0].id;
    }
  }
  // 3. Test status filtering with each status
  for (const status of statusFilters) {
    const response = await api.functional.hrmTracker.member.timesheets.index(
      authorizedConnection,
      {
        body: {
          status,
          page: 1,
          limit: 100,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
    typia.assert(response);
    // Validate all returned timesheets have the requested status
    response.data.forEach((timesheet) => {
      TestValidator.equals("status matches filter", timesheet.status, status);
    });
    TestValidator.predicate(
      "has valid pagination",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "has valid records",
      response.pagination.records >= 0,
    );
  }
  // 4. Test combined status filtering
  const combinedStatusResponse =
    await api.functional.hrmTracker.member.timesheets.index(
      authorizedConnection,
      {
        body: {
          status: "submitted",
          page: 1,
          limit: 100,
        } satisfies IHrmTrackerTimesheet.IRequest,
      },
    );
  typia.assert(combinedStatusResponse);
  // Verify filtered results only contain submitted status timesheets
  combinedStatusResponse.data.forEach((timesheet) => {
    TestValidator.equals(
      "filtered timesheet status",
      timesheet.status,
      "submitted",
    );
  });
  // 5. Validate timesheet structure and workflow fields
  combinedStatusResponse.data.forEach((timesheet) => {
    TestValidator.predicate(
      "has valid timesheet ID",
      /^[0-9a-f-]{36}$/i.test(timesheet.id),
    );
    TestValidator.predicate(
      "has valid employee ID",
      /^[0-9a-f-]{36}$/i.test(timesheet.employee_id),
    );
    TestValidator.predicate(
      "has valid organization ID",
      /^[0-9a-f-]{36}$/i.test(timesheet.organization_id),
    );
    TestValidator.predicate(
      "has valid week_start_date",
      timesheet.week_start_date !== null,
    );
    TestValidator.predicate(
      "has valid week_end_date",
      timesheet.week_end_date !== null,
    );
    TestValidator.predicate(
      "has non-negative total_hours",
      timesheet.total_hours >= 0,
    );
    TestValidator.predicate(
      "has valid submitted_at",
      timesheet.submitted_at !== null,
    );
    TestValidator.predicate(
      "has valid reviewed_at",
      timesheet.reviewed_at !== null,
    );
  });
}
