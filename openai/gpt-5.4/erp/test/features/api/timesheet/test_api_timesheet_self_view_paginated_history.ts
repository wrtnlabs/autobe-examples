import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_self_view_paginated_history(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(joined);
  const mondayWeeks = ArrayUtil.repeat(5, (index) => {
    const now = new Date();
    const utcDay = now.getUTCDay();
    const distanceToMonday = (utcDay + 6) % 7;
    const monday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - distanceToMonday - index * 7,
        0,
        0,
        0,
        0,
      ),
    );
    return monday.toISOString();
  });
  const created = await ArrayUtil.asyncMap(
    mondayWeeks,
    async (week_start_date) => {
      const timesheet =
        await generate_random_hrm_time_tracking_employee_timesheets_create(
          employeeConnection,
          {
            body: {
              week_start_date,
            } satisfies IHrmTimeTrackingTimesheet.ICreate,
          },
        );
      typia.assert(timesheet);
      return timesheet;
    },
  );
  TestValidator.predicate(
    "created owned timesheet history",
    created.length > 0,
  );
  const firstCreated = created[0]!;
  const oldestCreated = created[created.length - 1]!;
  const newestCreated = created.slice().sort((x, y) => {
    if (x.week_start_date === y.week_start_date)
      return x.id.localeCompare(y.id);
    return y.week_start_date.localeCompare(x.week_start_date);
  });
  const page = 1 satisfies number as number;
  const limit = 2 satisfies number as number;
  const request = {
    weekStartDateFrom: oldestCreated.week_start_date,
    weekStartDateTo: newestCreated[0]!.week_start_date,
    page,
    limit,
  } satisfies IHrmTimeTrackingTimesheet.IRequest;
  const firstPage =
    await api.functional.hrmTimeTracking.employee.timesheets.index(
      employeeConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  const repeatedPage =
    await api.functional.hrmTimeTracking.employee.timesheets.index(
      employeeConnection,
      {
        body: request,
      },
    );
  typia.assert(repeatedPage);
  TestValidator.equals(
    "current page matches request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit matches request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "records cover returned rows",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "history page returns rows",
    firstPage.data.length > 0,
  );
  for (const row of firstPage.data) {
    TestValidator.equals(
      "row belongs to authenticated employee",
      row.employee.id,
      joined.id,
    );
    TestValidator.equals(
      "row belongs to same organization",
      row.organization.id,
      firstCreated.organization.id,
    );
  }
  const offset =
    ((request.page ?? 1) - 1) * (request.limit ?? firstPage.data.length);
  const expectedIds = newestCreated
    .slice(offset, offset + (request.limit ?? firstPage.data.length))
    .map((timesheet) => timesheet.id);
  const firstIds = firstPage.data.map((row) => row.id);
  const repeatedIds = repeatedPage.data.map((row) => row.id);
  TestValidator.equals(
    "page rows follow deterministic ordering",
    firstIds,
    expectedIds,
  );
  TestValidator.equals(
    "repeat query returns identical row ids",
    repeatedIds,
    firstIds,
  );
}
