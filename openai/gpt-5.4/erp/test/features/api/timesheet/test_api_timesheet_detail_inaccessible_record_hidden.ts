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

export async function test_api_timesheet_detail_inaccessible_record_hidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const monday = new Date();
  const day = monday.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      ownerConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(created);
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "inaccessible timesheet detail is hidden from unauthenticated context",
    async () => {
      await api.functional.hrmTimeTracking.employee.timesheets.at(
        unauthorizedConnection,
        {
          timesheetId: created.id,
        },
      );
    },
  );
  const unchanged = await api.functional.hrmTimeTracking.employee.timesheets.at(
    ownerConnection,
    {
      timesheetId: created.id,
    },
  );
  typia.assert(unchanged);
  TestValidator.equals("timesheet id unchanged", unchanged.id, created.id);
  TestValidator.equals(
    "timesheet organization unchanged",
    unchanged.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "timesheet employee unchanged",
    unchanged.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "week start unchanged",
    unchanged.week_start_date,
    created.week_start_date,
  );
  TestValidator.equals(
    "week end unchanged",
    unchanged.week_end_date,
    created.week_end_date,
  );
  TestValidator.equals("status unchanged", unchanged.status, created.status);
  TestValidator.equals(
    "total hours unchanged",
    unchanged.total_hours,
    created.total_hours,
  );
  TestValidator.equals(
    "submitted timestamp unchanged",
    unchanged.submitted_at,
    created.submitted_at,
  );
  TestValidator.equals(
    "reviewed timestamp unchanged",
    unchanged.reviewed_at,
    created.reviewed_at,
  );
  TestValidator.equals(
    "deleted timestamp unchanged",
    unchanged.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "timelog collection unchanged",
    unchanged.timelogs.map((timelog) => timelog.id),
    created.timelogs.map((timelog) => timelog.id),
  );
}
