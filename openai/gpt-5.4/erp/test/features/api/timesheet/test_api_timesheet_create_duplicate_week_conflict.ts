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

export async function test_api_timesheet_create_duplicate_week_conflict(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: "https://example.com/hrm/join",
        referrer: "https://example.com/hrm",
      } satisfies IHrmTimeTrackingEmployee.IJoin,
    });
  typia.assert(authorized);
  const body = {
    week_start_date: "2024-01-01T00:00:00.000Z",
  } satisfies IHrmTimeTrackingTimesheet.ICreate;
  const created: IHrmTimeTrackingTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "employee matches authorized user",
    created.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "organization matches employee context",
    created.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "week start date matches request",
    created.week_start_date,
    body.week_start_date,
  );
  TestValidator.equals("timesheet starts as draft", created.status, "draft");
  TestValidator.equals(
    "submitted_at is null on create",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null on create",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null on create",
    created.rejection_reason,
    null,
  );
  TestValidator.equals("timesheet is active", created.deleted_at, null);
  TestValidator.predicate(
    "timelogs collection exists",
    Array.isArray(created.timelogs),
  );
  await TestValidator.httpError(
    "duplicate weekly draft creation is rejected",
    [400, 409, 422],
    async () => {
      await generate_random_hrm_time_tracking_employee_timesheets_create(
        employeeConnection,
        {
          body,
        },
      );
    },
  );
  TestValidator.equals(
    "original timesheet employee unchanged",
    created.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "original timesheet organization unchanged",
    created.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "original timesheet week unchanged",
    created.week_start_date,
    body.week_start_date,
  );
  TestValidator.equals(
    "original timesheet status unchanged",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "original timesheet submitted_at unchanged",
    created.submitted_at,
    null,
  );
  TestValidator.equals(
    "original timesheet reviewed_at unchanged",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "original timesheet rejection_reason unchanged",
    created.rejection_reason,
    null,
  );
  TestValidator.equals(
    "original timesheet deleted_at unchanged",
    created.deleted_at,
    null,
  );
}
