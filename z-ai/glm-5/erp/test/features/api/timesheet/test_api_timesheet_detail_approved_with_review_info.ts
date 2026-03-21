import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_detail_approved_with_review_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random timesheet ID (since no creation API is available)
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the timesheet
  const timesheet = await api.functional.erpHrm.member.timesheets.at(
    memberConnection,
    { timesheetId },
  );
  typia.assert(timesheet);
  // 4. Validate review information consistency (business logic)
  // If there's a reviewer, the timesheet must have been reviewed
  if (timesheet.reviewer !== null) {
    TestValidator.predicate(
      "reviewer has display name",
      timesheet.reviewer.displayName.length > 0,
    );
    TestValidator.predicate(
      "reviewed_at exists when reviewer exists",
      timesheet.reviewed_at !== null,
    );
    TestValidator.predicate(
      "status is approved or rejected when reviewer exists",
      timesheet.status === "approved" || timesheet.status === "rejected",
    );
  }
  // If status is approved or rejected, there should be a reviewer
  if (timesheet.status === "approved" || timesheet.status === "rejected") {
    TestValidator.predicate(
      "reviewer exists for approved/rejected timesheet",
      timesheet.reviewer !== null,
    );
    TestValidator.predicate(
      "reviewed_at exists for approved/rejected timesheet",
      timesheet.reviewed_at !== null,
    );
  }
  // 5. Validate total_hours consistency with timelogs (business logic)
  // Total hours should be the sum of all timelog durations divided by 60
  const expectedTotalHours = timesheet.timelogs.reduce(
    (sum, timelog) => sum + timelog.duration / 60,
    0,
  );
  TestValidator.equals(
    "total_hours matches sum of timelog durations",
    timesheet.total_hours,
    expectedTotalHours,
  );
}
