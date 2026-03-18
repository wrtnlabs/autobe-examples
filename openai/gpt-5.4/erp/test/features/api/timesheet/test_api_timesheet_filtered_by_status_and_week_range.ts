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

export async function test_api_timesheet_filtered_by_status_and_week_range(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const authorized = await authorize_employee_join(employeeConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const outsideDraft =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date(
            Date.UTC(2024, 0, 1, 0, 0, 0),
          ).toISOString(),
        },
      },
    );
  typia.assert(outsideDraft);
  const submittedTarget =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date(
            Date.UTC(2024, 0, 8, 0, 0, 0),
          ).toISOString(),
        },
      },
    );
  typia.assert(submittedTarget);
  const boundaryDraft =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date(
            Date.UTC(2024, 0, 15, 0, 0, 0),
          ).toISOString(),
        },
      },
    );
  typia.assert(boundaryDraft);
  TestValidator.equals("outside draft status", outsideDraft.status, "draft");
  TestValidator.equals(
    "outside draft submitted_at",
    outsideDraft.submitted_at,
    null,
  );
  TestValidator.equals(
    "outside draft reviewed_at",
    outsideDraft.reviewed_at,
    null,
  );
  TestValidator.equals(
    "outside draft rejection_reason",
    outsideDraft.rejection_reason,
    null,
  );
  TestValidator.equals(
    "outside draft employee ownership",
    outsideDraft.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "submitted target initial status",
    submittedTarget.status,
    "draft",
  );
  TestValidator.equals(
    "submitted target initial submitted_at",
    submittedTarget.submitted_at,
    null,
  );
  TestValidator.equals(
    "submitted target initial reviewed_at",
    submittedTarget.reviewed_at,
    null,
  );
  TestValidator.equals(
    "submitted target initial rejection_reason",
    submittedTarget.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitted target employee ownership",
    submittedTarget.employee.id,
    authorized.id,
  );
  TestValidator.equals("boundary draft status", boundaryDraft.status, "draft");
  TestValidator.equals(
    "boundary draft submitted_at",
    boundaryDraft.submitted_at,
    null,
  );
  TestValidator.equals(
    "boundary draft reviewed_at",
    boundaryDraft.reviewed_at,
    null,
  );
  TestValidator.equals(
    "boundary draft rejection_reason",
    boundaryDraft.rejection_reason,
    null,
  );
  TestValidator.equals(
    "boundary draft employee ownership",
    boundaryDraft.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "same organization for created timesheets",
    outsideDraft.organization.id,
    submittedTarget.organization.id,
  );
  TestValidator.equals(
    "same organization for boundary draft",
    submittedTarget.organization.id,
    boundaryDraft.organization.id,
  );
  const submitted =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: submittedTarget.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet id",
    submitted.id,
    submittedTarget.id,
  );
  TestValidator.equals("submitted status", submitted.status, "submitted");
  TestValidator.predicate(
    "submitted_at populated",
    submitted.submitted_at !== null,
  );
  TestValidator.equals(
    "submitted reviewed_at remains null",
    submitted.reviewed_at,
    null,
  );
  TestValidator.equals(
    "submitted rejection_reason remains null",
    submitted.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitted employee ownership",
    submitted.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "submitted organization remains stable",
    submitted.organization.id,
    submittedTarget.organization.id,
  );
  const page = await api.functional.hrmTimeTracking.employee.timesheets.index(
    employeeConnection,
    {
      body: {
        status: "submitted",
        weekStartDateFrom: submitted.week_start_date,
        weekStartDateTo: submitted.week_start_date,
        weekEndDateFrom: submitted.week_end_date,
        weekEndDateTo: submitted.week_end_date,
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("filtered page current", page.pagination.current, 1);
  TestValidator.equals("filtered page limit", page.pagination.limit, 10);
  TestValidator.equals(
    "filtered page records matches data length",
    page.pagination.records,
    page.data.length,
  );
  TestValidator.equals(
    "filtered page records count",
    page.pagination.records,
    1,
  );
  TestValidator.equals("filtered page pages", page.pagination.pages, 1);
  TestValidator.equals("filtered row count", page.data.length, 1);
  const row = page.data[0]!;
  TestValidator.equals("filtered row id", row.id, submitted.id);
  TestValidator.equals("filtered row status", row.status, "submitted");
  TestValidator.equals(
    "filtered row week start",
    row.week_start_date,
    submitted.week_start_date,
  );
  TestValidator.equals(
    "filtered row week end",
    row.week_end_date,
    submitted.week_end_date,
  );
  TestValidator.predicate(
    "filtered row submitted_at populated",
    row.submitted_at !== null,
  );
  TestValidator.equals("filtered row reviewed_at null", row.reviewed_at, null);
  TestValidator.equals(
    "filtered row rejection_reason null",
    row.rejection_reason,
    null,
  );
  TestValidator.equals(
    "filtered row employee ownership",
    row.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "filtered row organization",
    row.organization.id,
    submitted.organization.id,
  );
  TestValidator.equals(
    "filtered row organization matches created organization",
    row.organization.id,
    outsideDraft.organization.id,
  );
  TestValidator.predicate(
    "outside draft excluded from filtered result",
    page.data.every((item) => item.id !== outsideDraft.id),
  );
  TestValidator.predicate(
    "boundary draft excluded from filtered result",
    page.data.every((item) => item.id !== boundaryDraft.id),
  );
  TestValidator.predicate(
    "all returned rows belong to authenticated employee",
    page.data.every((item) => item.employee.id === authorized.id),
  );
  TestValidator.predicate(
    "all returned rows belong to current organization",
    page.data.every(
      (item) => item.organization.id === submitted.organization.id,
    ),
  );
}
