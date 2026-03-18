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

export async function test_api_timesheet_detail_employee_own_draft_view(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/hrm/timesheets/join",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  const weekStartDate = "2024-01-01T00:00:00.000Z";
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(created);
  const found = await api.functional.hrmTimeTracking.employee.timesheets.at(
    employeeConnection,
    {
      timesheetId: created.id,
    },
  );
  typia.assert(found);
  TestValidator.equals("same timesheet id", found.id, created.id);
  TestValidator.equals(
    "same organization summary",
    found.organization,
    created.organization,
  );
  TestValidator.equals(
    "same employee summary",
    found.employee,
    created.employee,
  );
  TestValidator.equals(
    "same requested week start date",
    found.week_start_date,
    created.week_start_date,
  );
  TestValidator.equals(
    "same derived week end date",
    found.week_end_date,
    created.week_end_date,
  );
  TestValidator.equals("draft status on create", created.status, "draft");
  TestValidator.equals("draft status preserved on read", found.status, "draft");
  TestValidator.equals(
    "timelog collection preserved",
    found.timelogs,
    created.timelogs,
  );
  TestValidator.equals(
    "total hours preserved",
    found.total_hours,
    created.total_hours,
  );
  TestValidator.equals("submitted_at remains null", found.submitted_at, null);
  TestValidator.equals("reviewed_at remains null", found.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason remains null",
    found.rejection_reason,
    null,
  );
  TestValidator.equals(
    "created_at unchanged after read",
    found.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged after read",
    found.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted_at unchanged after read",
    found.deleted_at,
    created.deleted_at,
  );
}
