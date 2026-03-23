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
    },
  });
  typia.assert(member);
  // 2. Create a draft timesheet
  // The DTO ISubmit only has timesheet_id, but we need to create a new draft
  // Since no proper DTO for creating timesheets with timelogs is available,
  // we'll use placeholder data for the create endpoint
  const createDraftTimesheet =
    await api.functional.hrmTracker.member.timesheets.create(memberConnection, {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    });
  typia.assert(createDraftTimesheet);
  // 3. Submit the draft timesheet
  const submittedTimesheet =
    await api.functional.hrmTracker.member.timesheets.submit(memberConnection, {
      timesheetId: createDraftTimesheet.id,
      body: {
        status: "submitted" as const,
        total_hours: 0,
        rejection_reason: null,
      } satisfies IHrmTrackerTimesheet.IUpdate,
    });
  typia.assert(submittedTimesheet);
  // 4. Validate submission
  TestValidator.equals(
    "status changed to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at timestamp recorded",
    submittedTimesheet.submitted_at !== null,
  );
}
