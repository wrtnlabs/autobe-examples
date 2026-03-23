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

export async function test_api_timesheet_deletion_by_owner_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(memberInfo);
  // Update connection with session token from registration
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberInfo.token.access,
    },
  };
  // 2. Create a draft timesheet
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    authenticatedConnection,
    {
      body: typia.random<IHrmTrackerTimesheet.ISubmit>(),
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 3. Delete the draft timesheet
  await api.functional.hrmTracker.member.timesheets.erase(
    authenticatedConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  // 4. Verify the timesheet is deleted (should throw 404 on subsequent access)
  await TestValidator.error("timesheet should be deleted", async () => {
    await api.functional.hrmTracker.member.timesheets.create(
      authenticatedConnection,
      {
        body: {
          timesheet_id: timesheet.id,
        } satisfies IHrmTrackerTimesheet.ISubmit,
      },
    );
  });
}