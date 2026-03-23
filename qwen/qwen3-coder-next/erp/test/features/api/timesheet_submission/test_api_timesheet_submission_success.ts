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

export async function test_api_timesheet_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Create new connection with auth token from join result
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: member.token.access,
  };
  // 2. Create timesheet directly (without separate creation step)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Previous Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Following Sunday
  // Since there's no separate create endpoint, we'll simulate a draft creation
  // by directly calling the submission endpoint with a created timesheet ID
  // (This is a workaround since the API only has submission endpoint)
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    authConnection,
    {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  // 3. Validate timesheet structure
  TestValidator.equals(
    "timesheet has employee",
    timesheet.employee !== undefined,
    true,
  );
  TestValidator.equals(
    "timesheet has organization",
    timesheet.organization !== undefined,
    true,
  );
  // 4. Verify submission is successful (status should be submitted)
  TestValidator.equals("status is submitted", timesheet.status, "submitted");
  TestValidator.notEquals("submitted_at is set", timesheet.submitted_at, null);
  // 5. Verify employee owns the timesheet
  TestValidator.equals(
    "employee_id matches member id",
    timesheet.employee.id,
    member.id,
  );
  // 6. Verify organization context
  TestValidator.equals(
    "organization is present",
    timesheet.organization.id !== undefined,
    true,
  );
  // 7. Verify cannot submit same timesheet twice
  await TestValidator.error("duplicate submission throws error", async () => {
    await api.functional.hrmTracker.member.timesheets.create(authConnection, {
      body: {
        timesheet_id: timesheet.id,
      } satisfies IHrmTrackerTimesheet.ISubmit,
    });
  });
}
