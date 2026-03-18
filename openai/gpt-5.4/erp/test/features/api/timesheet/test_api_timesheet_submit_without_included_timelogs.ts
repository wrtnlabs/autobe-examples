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

export async function test_api_timesheet_submit_without_included_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/timesheets/join",
      referrer: "https://example.com/hrm/timesheets",
      ip: "127.0.0.1",
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const now = new Date();
  const daysUntilNextMonday = (8 - now.getUTCDay()) % 7 || 7;
  const nextMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilNextMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const futureMonday = new Date(
    nextMonday.getTime() + 28 * 24 * 60 * 60 * 1000,
  );
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: futureMonday.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "timesheet owner matches employee",
    created.employee.id,
    authorized.id,
  );
  TestValidator.equals("draft status before submit", created.status, "draft");
  TestValidator.equals("timelogs start empty", created.timelogs.length, 0);
  TestValidator.equals("total hours start at zero", created.total_hours, 0);
  TestValidator.equals("submitted_at starts null", created.submitted_at, null);
  TestValidator.equals("reviewed_at starts null", created.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason starts null",
    created.rejection_reason,
    null,
  );
  await TestValidator.error(
    "reject submit without included timelogs",
    async () => {
      await api.functional.hrmTimeTracking.employee.timesheets.submit(
        employeeConnection,
        {
          timesheetId: created.id,
        },
      );
    },
  );
  TestValidator.equals(
    "draft invariant from created resource remains draft before failed submit transition",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "draft invariant from created resource keeps submitted_at null before failed submit transition",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "draft invariant from created resource keeps reviewed_at null before failed submit transition",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "draft invariant from created resource keeps rejection_reason null before failed submit transition",
    created.rejection_reason,
    null,
  );
}
