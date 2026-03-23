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

export async function test_api_timesheet_rejection_by_authorized_manager(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection with time:approve permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(manager);
  // Create employee connection
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(employee);
  // Create timesheet as employee and submit it
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    employeeConnection,
    {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet created", timesheet.status, "draft");
  // Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmTracker.member.timesheets.create(
      employeeConnection,
      {
        body: {
          timesheet_id: timesheet.id,
        } satisfies IHrmTrackerTimesheet.ISubmit,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // Get timesheet details before rejection
  const beforeRejection = await api.functional.hrmTracker.member.timesheets.at(
    managerConnection,
    {
      timesheetId: submittedTimesheet.id,
    },
  );
  typia.assert(beforeRejection);
  TestValidator.equals(
    "status before rejection",
    beforeRejection.status,
    "submitted",
  );
  // Reject the timesheet as manager
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedTimesheet =
    await api.functional.hrmTracker.member.timesheets.reject(
      managerConnection,
      {
        timesheetId: submittedTimesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmTrackerTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "status after rejection",
    rejectedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "rejection reason stored",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.notEquals(
    "reviewed_at set",
    rejectedTimesheet.reviewed_at,
    null,
  );
}
