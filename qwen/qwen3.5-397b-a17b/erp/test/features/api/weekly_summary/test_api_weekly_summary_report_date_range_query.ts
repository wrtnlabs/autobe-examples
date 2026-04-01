import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_date_range_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create date range covering multiple weeks (approximately 4 weeks)
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 28); // 4 weeks ago
  const startDateStr = startDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const endDateStr = endDate.toISOString().split("T")[0]; // YYYY-MM-DD
  // 3. Query weekly summary report
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const response =
    await api.functional.hrmPlatform.member.reports.weekly_summary.index(
      memberConnection,
      {
        body: {
          startDate: startDateStr,
          endDate: endDateStr,
          page: page,
          limit: limit,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata matches request
  TestValidator.predicate(
    "current page matches request",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "limit matches request",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate weekly summaries business constraints
  for (const week of response.data) {
    TestValidator.predicate("totalHours is non-negative", week.totalHours >= 0);
    TestValidator.predicate(
      "timelogCount is non-negative",
      week.timelogCount >= 0,
    );
    TestValidator.predicate(
      "employeeCount is non-negative",
      week.employeeCount >= 0,
    );
  }
  // 6. Validate weeks are sorted by weekStart descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentWeek = new Date(response.data[i].weekStart).getTime();
      const nextWeek = new Date(response.data[i + 1].weekStart).getTime();
      TestValidator.predicate(
        `weeks sorted descending at index ${i}`,
        currentWeek >= nextWeek,
      );
    }
  }
  // 7. Validate week periods fall within requested date range
  const startDateTime = new Date(startDateStr).getTime();
  const endDateTime = new Date(endDateStr).getTime();
  for (const week of response.data) {
    const weekStartTime = new Date(week.weekStart).getTime();
    const weekEndTime = new Date(week.weekEnd).getTime();
    TestValidator.predicate(
      "weekStart within date range",
      weekStartTime >= startDateTime && weekStartTime <= endDateTime,
    );
    TestValidator.predicate(
      "weekEnd within date range",
      weekEndTime >= startDateTime && weekEndTime <= endDateTime,
    );
  }
}
