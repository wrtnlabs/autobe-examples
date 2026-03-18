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

export async function test_api_timesheet_delete_submitted_locked(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const created =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: undefined,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created timesheet starts as draft",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "created timesheet is active before submission",
    created.deleted_at,
    null,
  );
  const submitted =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: created.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet keeps same id",
    submitted.id,
    created.id,
  );
  TestValidator.equals(
    "timesheet becomes submitted",
    submitted.status,
    "submitted",
  );
  TestValidator.notEquals(
    "submitted timestamp is recorded",
    submitted.submitted_at,
    null,
  );
  await TestValidator.error(
    "submitted timesheet deletion is rejected",
    async () => {
      await api.functional.hrmTimeTracking.employee.timesheets.erase(
        employeeConnection,
        {
          timesheetId: submitted.id,
        },
      );
    },
  );
  const persisted = await api.functional.hrmTimeTracking.employee.timesheets.at(
    employeeConnection,
    {
      timesheetId: submitted.id,
    },
  );
  typia.assert(persisted);
  TestValidator.equals(
    "timesheet still exists after failed deletion",
    persisted.id,
    submitted.id,
  );
  TestValidator.equals(
    "timesheet status remains submitted",
    persisted.status,
    submitted.status,
  );
  TestValidator.equals(
    "submission timestamp remains unchanged",
    persisted.submitted_at,
    submitted.submitted_at,
  );
  TestValidator.equals(
    "timesheet ownership remains same employee",
    persisted.employee.id,
    submitted.employee.id,
  );
  TestValidator.equals(
    "timesheet remains undeleted",
    persisted.deleted_at,
    null,
  );
}
