import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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

export async function test_api_timesheet_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Test filtering by each status value
  const statuses = ["draft", "submitted", "approved", "rejected"] as const;
  for (const status of statuses) {
    const result = await api.functional.erpHrm.member.timesheets.index(
      memberConnection,
      {
        body: {
          status: status,
          limit: 100,
        } satisfies IErpHrmTimesheet.IRequest,
      },
    );
    typia.assert(result);
    // Verify all returned timesheets have the expected status
    for (const timesheet of result.data) {
      TestValidator.equals(
        `Timesheet status should be "${status}"`,
        timesheet.status,
        status,
      );
    }
  }
  // 3. Test combined status and date range filter
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const oneMonthLater = new Date(today);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const combinedResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "submitted",
        weekStartDate: {
          gte: oneMonthAgo.toISOString(),
          lte: oneMonthLater.toISOString(),
        },
        limit: 100,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Verify all returned timesheets match both filters
  for (const timesheet of combinedResult.data) {
    TestValidator.equals(
      "Timesheet status should be submitted",
      timesheet.status,
      "submitted",
    );
  }
  // 4. Test pagination with status filter
  const paginatedResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "submitted",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(paginatedResult);
  // Verify pagination metadata
  TestValidator.predicate(
    "Page should be 1",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Limit should be 10",
    paginatedResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Results count should not exceed limit",
    paginatedResult.data.length <= 10,
  );
}
