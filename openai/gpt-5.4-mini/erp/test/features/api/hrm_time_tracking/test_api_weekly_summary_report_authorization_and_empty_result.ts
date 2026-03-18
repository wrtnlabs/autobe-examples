import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_authorization_and_empty_result(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(unauthorizedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  await TestValidator.httpError(
    "weekly summary report should reject members without permission",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.reports.weekly_summary.index(
        unauthorizedConnection,
        {
          body: {
            startDate: "1990-01-01",
            endDate: "1990-01-07",
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingWeeklySummaryReport.IRequest,
        },
      );
    },
  );
  const permittedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(permittedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const response =
    await api.functional.hrmTimeTracking.member.reports.weekly_summary.index(
      permittedConnection,
      {
        body: {
          startDate: "1990-01-01",
          endDate: "1990-01-07",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("weekly summary empty data", response.data.length, 0);
  TestValidator.equals(
    "weekly summary page current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "weekly summary page limit",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "weekly summary page records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "weekly summary page pages",
    response.pagination.pages,
    0,
  );
}
