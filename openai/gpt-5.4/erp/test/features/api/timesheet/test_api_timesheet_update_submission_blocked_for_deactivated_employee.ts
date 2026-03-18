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

export async function test_api_timesheet_update_submission_blocked_for_deactivated_employee(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const monday = new Date();
  const day = monday.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(created);
  const updateBody = {
    status: "submitted",
    rejection_reason: null,
  } satisfies IHrmTimeTrackingTimesheet.IUpdate;
  const updated =
    await api.functional.hrmTimeTracking.employee.timesheets.update(
      employeeConnection,
      {
        timesheetId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("timesheet id is preserved", updated.id, created.id);
  TestValidator.equals(
    "employee id is preserved",
    updated.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "organization id is preserved",
    updated.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "week start date is preserved",
    updated.week_start_date,
    created.week_start_date,
  );
  TestValidator.equals(
    "week end date is preserved",
    updated.week_end_date,
    created.week_end_date,
  );
  TestValidator.equals("status becomes submitted", updated.status, "submitted");
  TestValidator.equals(
    "submitted timestamp exists after submission",
    updated.submitted_at === null,
    false,
  );
  TestValidator.equals(
    "reviewed timestamp remains null on submission",
    updated.reviewed_at,
    null,
  );
}
