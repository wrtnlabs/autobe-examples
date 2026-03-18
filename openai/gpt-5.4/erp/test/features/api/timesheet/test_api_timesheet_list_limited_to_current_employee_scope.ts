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

export async function test_api_timesheet_list_limited_to_current_employee_scope(
  connection: api.IConnection,
): Promise<void> {
  const callerConnection: api.IConnection = { host: connection.host };
  const callerAuth = await authorize_employee_join(callerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(callerAuth);
  const otherEmployeeConnection: api.IConnection = { host: connection.host };
  const otherEmployeeAuth = await authorize_employee_join(
    otherEmployeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password1234!" as string & tags.Format<"password">,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(otherEmployeeAuth);
  const callerWeekStarts = [
    "2024-01-01T00:00:00.000Z",
    "2024-01-08T00:00:00.000Z",
  ] as const;
  const otherWeekStarts = [
    "2024-01-15T00:00:00.000Z",
    "2024-01-22T00:00:00.000Z",
  ] as const;
  const callerTimesheets = await ArrayUtil.asyncMap(
    callerWeekStarts,
    async (week_start_date) => {
      const created =
        await generate_random_hrm_time_tracking_employee_timesheets_create(
          callerConnection,
          {
            body: {
              week_start_date,
            } satisfies IHrmTimeTrackingTimesheet.ICreate,
          },
        );
      typia.assert(created);
      return created;
    },
  );
  await ArrayUtil.asyncForEach(otherWeekStarts, async (week_start_date) => {
    const created =
      await generate_random_hrm_time_tracking_employee_timesheets_create(
        otherEmployeeConnection,
        {
          body: { week_start_date } satisfies IHrmTimeTrackingTimesheet.ICreate,
        },
      );
    typia.assert(created);
  });
  const page = await api.functional.hrmTimeTracking.employee.timesheets.index(
    callerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "caller owned timesheets are listed",
    callerTimesheets.every((timesheet) =>
      page.data.some((row) => row.id === timesheet.id),
    ),
  );
  TestValidator.predicate(
    "other employee timesheets are excluded",
    page.data.every((row) => row.employee.id !== otherEmployeeAuth.id),
  );
  TestValidator.predicate(
    "every row belongs to caller employee summary",
    page.data.every((row) => row.employee.id === callerAuth.id),
  );
  TestValidator.predicate(
    "every row belongs to current organization summary",
    page.data.every(
      (row) => row.organization.id === callerAuth.role.organization.id,
    ),
  );
}
