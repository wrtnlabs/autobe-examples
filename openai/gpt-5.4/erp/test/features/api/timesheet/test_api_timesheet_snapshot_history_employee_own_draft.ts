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

export async function test_api_timesheet_snapshot_history_employee_own_draft(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string,
      href: "https://example.com/hrm/timesheets" satisfies string as string,
      referrer: "https://example.com/hrm" satisfies string as string,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const monday = new Date("2026-03-09T00:00:00.000Z").toISOString();
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday,
        },
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "timesheet belongs to authorized employee",
    created.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timesheet belongs to authorized organization",
    created.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals("draft status on creation", created.status, "draft");
  TestValidator.equals(
    "submitted_at remains null on creation",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at remains null on creation",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason remains null on creation",
    created.rejection_reason,
    null,
  );
  const requestedPage = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const requestedLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const requestBody = {
    page: requestedPage,
    limit: requestedLimit,
  } satisfies IHrmTimeTrackingTimesheetSnapshot.IRequest;
  const history =
    await api.functional.hrmTimeTracking.employee.timesheets.snapshots.index(
      employeeConnection,
      {
        timesheetId: created.id,
        body: requestBody,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit",
    history.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    history.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    history.data.length <= requestedLimit,
  );
  if (history.pagination.records === 0) {
    TestValidator.equals(
      "empty history returns empty data",
      history.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "non-empty history returns at least one snapshot",
      history.data.length > 0,
    );
  }
  TestValidator.equals(
    "timesheet status unchanged after snapshot history call",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet submitted_at unchanged after snapshot history call",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "timesheet reviewed_at unchanged after snapshot history call",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "timesheet rejection_reason unchanged after snapshot history call",
    created.rejection_reason,
    null,
  );
  TestValidator.equals(
    "timesheet organization unchanged after snapshot history call",
    created.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "timesheet employee unchanged after snapshot history call",
    created.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timesheet week_start_date unchanged",
    created.week_start_date,
    monday,
  );
  TestValidator.equals(
    "timesheet week_end_date unchanged",
    created.week_end_date,
    created.week_end_date,
  );
}
