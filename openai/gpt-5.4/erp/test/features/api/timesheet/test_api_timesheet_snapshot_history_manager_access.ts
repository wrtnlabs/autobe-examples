import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
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
import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_snapshot_history_manager_access(
  connection: api.IConnection,
): Promise<void> {
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerJoinBody = {
    email: managerEmail,
    password: managerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.IJoin;
  const managerJoinConnection: api.IConnection = { host: connection.host };
  const managerJoined = await authorize_manager_join(managerJoinConnection, {
    body: managerJoinBody,
  });
  typia.assert(managerJoined);
  const managerConnection: api.IConnection = { host: connection.host };
  const managerLoginBody = {
    email: managerEmail,
    password: managerPassword,
    href: managerJoinBody.href,
    referrer: managerJoinBody.referrer,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingManager.ILogin;
  const managerAuthorized = await authorize_manager_login(managerConnection, {
    body: managerLoginBody,
  });
  typia.assert(managerAuthorized);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeJoinBody = {
    email: employeeEmail,
    password: employeePassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.IJoin;
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeJoined = await authorize_employee_join(employeeJoinConnection, {
    body: employeeJoinBody,
  });
  typia.assert(employeeJoined);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeLoginBody = {
    email: employeeEmail,
    password: employeePassword,
    href: employeeJoinBody.href,
    referrer: employeeJoinBody.referrer,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingEmployee.ILogin;
  const employeeAuthorized = await authorize_employee_login(
    employeeConnection,
    {
      body: employeeLoginBody,
    },
  );
  typia.assert(employeeAuthorized);
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const timesheetBefore = JSON.stringify(timesheet);
  const request = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "-id",
  } satisfies IHrmTimeTrackingTimesheetSnapshot.IRequest;
  const history =
    await api.functional.hrmTimeTracking.manager.timesheets.snapshots.index(
      managerConnection,
      {
        timesheetId: timesheet.id,
        body: request,
      },
    );
  typia.assert(history);
  TestValidator.equals(
    "requested page reflected in pagination",
    history.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit reflected in pagination",
    history.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    history.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    history.data.length <= history.pagination.limit,
  );
  TestValidator.equals(
    "snapshot retrieval does not mutate local parent fixture",
    JSON.stringify(timesheet),
    timesheetBefore,
  );
  if (history.data.length > 1) {
    const uniqueIds = new Set(history.data.map((snapshot) => snapshot.id));
    TestValidator.equals(
      "snapshot ids are unique within page",
      uniqueIds.size,
      history.data.length,
    );
  }
}
