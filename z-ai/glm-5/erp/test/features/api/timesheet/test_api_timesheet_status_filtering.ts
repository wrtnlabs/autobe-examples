import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member account via join authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Define all possible status values
  const statuses = ["draft", "submitted", "approved", "rejected"] as const;
  // Test filtering by each status individually
  for (const status of statuses) {
    const response = await api.functional.erpHrm.member.timesheets.index(
      memberConnection,
      {
        body: { status },
      },
    );
    typia.assert(response);
    // Validate all returned timesheets have the matching status
    for (const timesheet of response.data) {
      TestValidator.equals(
        `timesheet status matches '${status}' filter`,
        timesheet.status,
        status,
      );
    }
  }
  // Test pagination within filtered results
  const paginatedResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: { status: "draft", page: 1, limit: 10 },
    },
  );
  typia.assert(paginatedResponse);
  // Validate pagination info is present and valid
  TestValidator.predicate(
    "pagination current page is at least 1",
    paginatedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginatedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedResponse.pagination.pages >= 0,
  );
  // All paginated timesheets should still match the status filter
  for (const timesheet of paginatedResponse.data) {
    TestValidator.equals(
      "paginated timesheet status matches filter",
      timesheet.status,
      "draft",
    );
  }
  // Test combining status filter with date range filter
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 1);
  const toDate = new Date();
  toDate.setMonth(toDate.getMonth() + 1);
  const combinedResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "draft",
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
      },
    },
  );
  typia.assert(combinedResponse);
  // Validate all returned timesheets match both filters
  for (const timesheet of combinedResponse.data) {
    TestValidator.equals(
      "combined filter timesheet status matches",
      timesheet.status,
      "draft",
    );
    const weekStartDate = new Date(timesheet.weekStartDate);
    TestValidator.predicate(
      "combined filter week start date is within range",
      weekStartDate >= fromDate && weekStartDate <= toDate,
    );
  }
}
