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

export async function test_api_timesheet_employee_retrieves_own_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as member to get authenticated session
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    phone: null,
  } satisfies IHrmTrackerMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember: IHrmTrackerMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: joinInput,
    });
  typia.assert(authorizedMember);
  // Step 2: Create a draft timesheet for the member
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  // Create timesheet using the provided ISUBMIT API format
  const createdTimesheet =
    await api.functional.hrmTracker.member.timesheets.create(memberConnection, {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    });
  typia.assert(createdTimesheet);
  // Step 3: Retrieve the draft timesheet
  const retrievedTimesheet =
    await api.functional.hrmTracker.member.timesheets.at(memberConnection, {
      timesheetId: createdTimesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // Step 4: Validate retrieved timesheet
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    createdTimesheet.id,
  );
  TestValidator.equals(
    "timesheet status is draft",
    retrievedTimesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "has valid employee reference",
    retrievedTimesheet.employee !== null &&
      retrievedTimesheet.employee.id !== null,
  );
  TestValidator.predicate(
    "has valid organization reference",
    retrievedTimesheet.organization !== null &&
      retrievedTimesheet.organization.id !== null,
  );
}
