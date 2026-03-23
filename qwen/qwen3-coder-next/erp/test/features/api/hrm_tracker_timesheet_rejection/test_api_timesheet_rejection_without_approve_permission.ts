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

export async function test_api_timesheet_rejection_without_approve_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization
  const organization = typia.random<IHrmTrackerOrganization.ISummary>();
  // 2. Create manager account
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(manager);
  // 3. Create employee account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(employee);
  // 4. Employee creates timesheet
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    employeeConnection,
    {
      body: {
        timesheet_id: manager.id,
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  // 5. Manager attempts to reject without permission
  await TestValidator.error("permission denied", async () => {
    await api.functional.hrmTracker.member.timesheets.reject(
      managerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: "Missing approve permission",
        } satisfies IHrmTrackerTimesheet.IReject,
      },
    );
  });
}
