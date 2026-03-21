import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmWeeklySummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare date range for a future period where no timelogs exist
  // Use dates far in the future to ensure empty results
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const from = new Date(futureDate);
  from.setDate(from.getDate() - 30);
  const to = futureDate;
  // 3. Call weekly summary endpoint with future date range
  const response =
    await api.functional.erpHrm.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          from: from.toISOString() satisfies string & tags.Format<"date-time">,
          to: to.toISOString() satisfies string & tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IErpHrmWeeklySummary.IRequest,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate empty results with proper pagination
  TestValidator.equals("data array should be empty", response.data, []);
  TestValidator.equals(
    "pagination.current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination.records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    response.pagination.pages,
    0,
  );
}
