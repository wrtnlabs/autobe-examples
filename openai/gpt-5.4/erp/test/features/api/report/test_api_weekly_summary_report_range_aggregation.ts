import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_weekly_summary_report_range_aggregation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/reports/weekly-summaries",
      referrer: "https://example.com/hrm/dashboard",
    },
  });
  typia.assert(authorized);
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysFromMonday = (utcDay + 6) % 7;
  const currentWeekMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const rangeStart = new Date(
    currentWeekMonday.getTime() - 14 * 24 * 60 * 60 * 1000,
  );
  const rangeEnd = new Date(currentWeekMonday.getTime() - 1);
  const request = {
    range_start_date: rangeStart.toISOString(),
    range_end_date: rangeEnd.toISOString(),
    page: 1,
    limit: 10,
    sort: "+created_at",
  } satisfies IHrmTimeTrackingReport.IRequest;
  const first =
    await api.functional.hrmTimeTracking.owner.reports.weeklySummaries.index(
      ownerConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.hrmTimeTracking.owner.reports.weeklySummaries.index(
      ownerConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "same criteria should return repeatable report page",
    first,
    second,
  );
  TestValidator.equals(
    "requested page should be reflected in pagination",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit should be reflected in pagination",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "record count must be non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count must be non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned row count must not exceed requested limit",
    first.data.length <= request.limit,
  );
  const requestedStart = new Date(
    request.range_start_date ?? rangeStart.toISOString(),
  ).getTime();
  const requestedEnd = new Date(
    request.range_end_date ?? rangeEnd.toISOString(),
  ).getTime();
  for (const row of first.data) {
    TestValidator.predicate(
      "row start date stays within requested range when present",
      row.range_start_date === null ||
        new Date(row.range_start_date).getTime() >= requestedStart,
    );
    TestValidator.predicate(
      "row end date stays within requested range when present",
      row.range_end_date === null ||
        new Date(row.range_end_date).getTime() <= requestedEnd,
    );
  }
}
