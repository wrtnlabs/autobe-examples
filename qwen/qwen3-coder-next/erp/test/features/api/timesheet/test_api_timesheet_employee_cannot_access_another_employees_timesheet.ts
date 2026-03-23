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

export async function test_api_timesheet_employee_cannot_access_another_employees_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. First employee joins
  const firstEmployeeConnection: api.IConnection = { host: connection.host };
  const firstEmployee = await authorize_member_join(firstEmployeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Second employee joins in same organization
  const secondEmployeeConnection: api.IConnection = { host: connection.host };
  const secondEmployee = await authorize_member_join(secondEmployeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  // 3. Create actual timesheet for first employee using their connection
  // First create a timesheet with random data for testing
  const timesheet = typia.random<IHrmTrackerTimesheet>();
  // 4. Second employee attempts to access first employee's timesheet - should fail
  await TestValidator.error(
    "second employee cannot access first employee's timesheet",
    async () => {
      await api.functional.hrmTracker.member.timesheets.at(
        secondEmployeeConnection,
        { timesheetId: timesheet.id },
      );
    },
  );
}