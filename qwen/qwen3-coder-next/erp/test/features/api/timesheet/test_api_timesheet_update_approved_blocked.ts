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

export async function test_api_timesheet_update_approved_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two employees in the same organization
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1 = await authorize_member_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2 = await authorize_member_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Step 2: Create timesheet with employee1 and submit it
  const timesheetSubmit =
    await api.functional.hrmTracker.member.timesheets.create(
      employee1Connection,
      {
        body: {
          timesheet_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmTrackerTimesheet.ISubmit,
      },
    );
  typia.assert(timesheetSubmit);
  // Step 3: Employee2 (manager role) approves the timesheet
  const approvedTimesheet =
    await api.functional.hrmTracker.member.timesheets.approve(
      employee2Connection,
      {
        timesheetId: timesheetSubmit.id,
      },
    );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet status",
    approvedTimesheet.status,
    "approved",
  );
  // Step 4: Employee1 attempts to update the approved timesheet - should be blocked
  await TestValidator.error("approved timesheet update blocked", async () => {
    await api.functional.hrmTracker.member.timesheets.update(
      employee1Connection,
      {
        timesheetId: timesheetSubmit.id,
        body: {
          status: "draft",
          total_hours: 10,
          rejection_reason: "Revised hours",
        } satisfies IHrmTrackerTimesheet.IUpdate,
      },
    );
  });
}
