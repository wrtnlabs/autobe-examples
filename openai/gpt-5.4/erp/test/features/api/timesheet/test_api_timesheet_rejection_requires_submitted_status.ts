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

export async function test_api_timesheet_rejection_requires_submitted_status(
  connection: api.IConnection,
): Promise<void> {
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeHref = typia.random<string & tags.Format<"uri">>();
  const employeeReferrer = typia.random<string & tags.Format<"uri">>();
  const employeeIp = typia.random<string & tags.Format<"ipv4">>();
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeJoin = await authorize_employee_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: employeeHref,
      referrer: employeeReferrer,
      ip: employeeIp,
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeJoin);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeLogin = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: employeeHref,
      referrer: employeeReferrer,
      ip: employeeIp,
    } satisfies IHrmTimeTrackingEmployee.ILogin,
  });
  typia.assert(employeeLogin);
  const now = new Date();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  TestValidator.equals("timesheet starts as draft", timesheet.status, "draft");
  TestValidator.equals(
    "draft timesheet is not submitted",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet is not reviewed",
    timesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no rejection reason",
    timesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "timesheet belongs to logged-in employee",
    timesheet.employee.id,
    employeeLogin.id,
  );
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerHref = typia.random<string & tags.Format<"uri">>();
  const managerReferrer = typia.random<string & tags.Format<"uri">>();
  const managerIp = typia.random<string & tags.Format<"ipv4">>();
  const managerJoinConnection: api.IConnection = { host: connection.host };
  const managerJoin = await authorize_manager_join(managerJoinConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href: managerHref,
      referrer: managerReferrer,
      ip: managerIp,
    } satisfies IHrmTimeTrackingManager.IJoin,
  });
  typia.assert(managerJoin);
  const managerConnection: api.IConnection = { host: connection.host };
  const managerLogin = await authorize_manager_login(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href: managerHref,
      referrer: managerReferrer,
      ip: managerIp,
    } satisfies IHrmTimeTrackingManager.ILogin,
  });
  typia.assert(managerLogin);
  await TestValidator.error(
    "manager cannot reject a non-submitted draft timesheet",
    async () => {
      await api.functional.hrmTimeTracking.manager.timesheets.reject(
        managerConnection,
        {
          timesheetId: timesheet.id,
          body: {
            rejection_reason: null,
          } satisfies IHrmTimeTrackingTimesheet.IReject,
        },
      );
    },
  );
  TestValidator.equals(
    "known draft status remains unchanged locally",
    timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "known submitted_at remains absent locally",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "known reviewed_at remains absent locally",
    timesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "known rejection reason remains absent locally",
    timesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "known employee ownership remains unchanged locally",
    timesheet.employee.id,
    employeeLogin.id,
  );
}
