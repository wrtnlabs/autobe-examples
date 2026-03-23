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

export async function test_api_timesheet_deletion_by_owner_submitted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  // Step 2: Create a draft timesheet
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    memberConnection,
    {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  // Step 3: Submit the timesheet to change status to 'submitted'
  const submittedTimesheet =
    await api.functional.hrmTracker.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        status: "submitted",
        total_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >() satisfies number as number,
        rejection_reason: null,
      } satisfies IHrmTrackerTimesheet.IUpdate,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status changed to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // Step 4: Delete the submitted timesheet
  await api.functional.hrmTracker.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
}
