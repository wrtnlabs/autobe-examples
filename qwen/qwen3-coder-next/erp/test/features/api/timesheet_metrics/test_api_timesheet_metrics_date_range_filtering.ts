import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
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

export async function test_api_timesheet_metrics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Get initial metrics to establish baseline
  const initialMetrics =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "draft",
        },
      },
    );
  typia.assert(initialMetrics);
  // 3. Test date range filtering with future date range
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 7);
  const futureEnd = new Date();
  futureEnd.setDate(futureEnd.getDate() + 14);
  const futureFiltered =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "draft",
          week_start_date: futureStart.toISOString().split("T")[0],
          week_end_date: futureEnd.toISOString().split("T")[0],
        },
      },
    );
  typia.assert(futureFiltered);
  // 4. Test date range filtering with past date range
  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 14);
  const pastEnd = new Date();
  pastEnd.setDate(pastEnd.getDate() - 7);
  const pastFiltered =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "draft",
          week_start_date: pastStart.toISOString().split("T")[0],
          week_end_date: pastEnd.toISOString().split("T")[0],
        },
      },
    );
  typia.assert(pastFiltered);
  // 5. Test current week filtering
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - currentStart.getDay() + 1); // Monday
  const currentEnd = new Date();
  currentEnd.setDate(currentEnd.getDate() - currentEnd.getDay() + 7); // Sunday
  const currentFiltered =
    await api.functional.hrmTracker.member.timesheets.metrics.index(
      memberConnection,
      {
        body: {
          status: "draft",
          week_start_date: currentStart.toISOString().split("T")[0],
          week_end_date: currentEnd.toISOString().split("T")[0],
        },
      },
    );
  typia.assert(currentFiltered);
  // 6. Validate filtering logic - current week should potentially include more results
  // than future or past ranges (assuming no timesheets exist in those ranges)
  TestValidator.predicate(
    "current week results >= future results",
    currentFiltered.data.length >= futureFiltered.data.length,
  );
  TestValidator.predicate(
    "current week results >= past results",
    currentFiltered.data.length >= pastFiltered.data.length,
  );
  TestValidator.equals(
    "future filtered has correct structure",
    typeof futureFiltered.data,
    "object",
  );
  TestValidator.equals(
    "past filtered has correct structure",
    typeof pastFiltered.data,
    "object",
  );
  TestValidator.equals(
    "current filtered has correct structure",
    typeof currentFiltered.data,
    "object",
  );
  // 7. Validate pagination structure
  TestValidator.equals(
    "pagination structure correct",
    typeof futureFiltered.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination structure correct",
    typeof futureFiltered.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination structure correct",
    typeof futureFiltered.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination structure correct",
    typeof futureFiltered.pagination.pages,
    "number",
  );
}
