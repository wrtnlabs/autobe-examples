import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_manager_retrieves_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization for test context
  const organization = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_uri: null,
    status: "active" as const,
    created_at: new Date().toISOString(),
  };
  // 2. Register manager account
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(manager);
  // 3. Register employee account in same organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employee);
  // 4. Create timesheet as employee and submit for approval
  const timesheetData = {
    hrm_tracker_organization_id: organization.id,
    hrm_tracker_employee_id: employee.id,
    status: "draft",
    total_hours: 0,
    week_start_date: new Date().toISOString(),
    week_end_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    employeeConnection,
    {
      body: {
        timesheet_id: timesheetData.hrm_tracker_employee_id,
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  // 5. Submit timesheet for approval
  const submitted = await api.functional.hrmTracker.member.timesheets.submit(
    employeeConnection,
    {
      timesheetId: timesheet.id,
      body: {
        status: "submitted",
        total_hours: 40,
        rejection_reason: null,
      } satisfies IHrmTrackerTimesheet.IUpdate,
    },
  );
  typia.assert(submitted);
  // 6. Approve timesheet as manager
  const approved = await api.functional.hrmTracker.member.timesheets.approve(
    managerConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(approved);
  // 7. Retrieve approved timesheet with manager credentials
  const retrieved = await api.functional.hrmTracker.member.timesheets.at(
    managerConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrieved);
  // 8. Validate timesheet status and reviewer information
  TestValidator.equals(
    "timesheet status is approved",
    retrieved.status,
    "approved",
  );
  TestValidator.notEquals("has reviewer information", retrieved.reviewer, null);
  TestValidator.equals(
    "reviewer is manager",
    retrieved.reviewer?.id,
    manager.id,
  );
  TestValidator.predicate("has locked timelogs", retrieved.total_hours > 0);
}
