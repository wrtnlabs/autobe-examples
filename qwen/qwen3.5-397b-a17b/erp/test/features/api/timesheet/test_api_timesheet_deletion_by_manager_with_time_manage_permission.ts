import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_deletion_by_manager_with_time_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register manager account (will have time:manage permission in test environment)
  const managerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(managerAuth);
  // 2. Register employee account
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuth);
  // 3. Create employee connection and create a draft timesheet
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = { Authorization: employeeAuth.token.access };
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // Validate timesheet was created successfully
  TestValidator.predicate("timesheet has valid id", timesheet.id !== undefined);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "timesheet has week_start_date",
    timesheet.week_start_date !== undefined,
  );
  TestValidator.predicate(
    "timesheet has week_end_date",
    timesheet.week_end_date !== undefined,
  );
  // 4. Create manager connection with manager's auth token
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = { Authorization: managerAuth.token.access };
  // 5. Manager deletes the employee's draft timesheet
  // The erase endpoint returns void per SDK definition
  // Server-side permission check allows manager with time:manage to delete any employee's timesheet
  await api.functional.hrmPlatform.member.timesheets.erase(managerConnection, {
    timesheetId: timesheet.id,
  });
  // 6. Deletion succeeded (no exception thrown indicates success)
  // Note: Full deleted_at validation would require a GET endpoint to fetch the deleted timesheet,
  // which is not available in the provided SDK functions
}
