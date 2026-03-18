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
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheetSnapshot";
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

export async function test_api_timesheet_snapshot_history_forbidden_for_other_employee(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerAuth = await authorize_employee_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/timesheets/owner",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const ownerTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      ownerConnection,
      {
        body: {
          week_start_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        },
      },
    );
  typia.assert(ownerTimesheet);
  const intruderConnection: api.IConnection = {
    host: connection.host,
  };
  const intruderAuth = await authorize_employee_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/timesheets/intruder",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(intruderAuth);
  await TestValidator.httpError(
    "another employee cannot access snapshot history of someone else's timesheet",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.employee.timesheets.snapshots.index(
        intruderConnection,
        {
          timesheetId: ownerTimesheet.id,
          body: {
            page: 1 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: 10 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    },
  );
}
