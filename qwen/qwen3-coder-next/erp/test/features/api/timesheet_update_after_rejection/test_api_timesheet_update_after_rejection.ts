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

export async function test_api_timesheet_update_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee joins and gets authenticated
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employee);
  // 2. Manager joins and gets authenticated
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(manager);
  // 3. Employee creates and submits a draft timesheet for approval
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    employeeConnection,
    {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  // 4. Verify timesheet is in submitted status (ready for manager approval)
  TestValidator.equals(
    "timesheet status is submitted",
    timesheet.status,
    "submitted",
  );
  // 5. Manager rejects the timesheet with rejection_reason
  const rejected = await api.functional.hrmTracker.member.timesheets.reject(
    managerConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmTrackerTimesheet.IReject,
    },
  );
  typia.assert(rejected);
  // 6. Verify timesheet is now in rejected status with rejection reason
  TestValidator.equals(
    "timesheet status is rejected",
    rejected.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejection_reason is set",
    rejected.rejection_reason,
    null,
  );
  // 7. Employee updates the rejected timesheet (transition: rejected→draft allowed)
  const updated = await api.functional.hrmTracker.member.timesheets.update(
    employeeConnection,
    {
      timesheetId: timesheet.id,
      body: {
        status: "draft",
        total_hours: 0,
        rejection_reason: null,
      } satisfies IHrmTrackerTimesheet.IUpdate,
    },
  );
  typia.assert(updated);
  // 8. Verify timesheet is back in draft status
  TestValidator.equals("timesheet status is draft", updated.status, "draft");
  TestValidator.equals(
    "rejection_reason cleared",
    updated.rejection_reason,
    null,
  );
}
