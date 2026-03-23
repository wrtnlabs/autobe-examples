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

export async function test_api_timesheet_submission_wrong_ownership(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create two members
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member2);
  // Step 2: Member1 creates a draft timesheet (this will have their employee ID)
  const member1Timesheet =
    await api.functional.hrmTracker.member.timesheets.create(
      member1Connection,
      {
        body: {
          timesheet_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmTrackerTimesheet.ISubmit,
      },
    );
  typia.assert(member1Timesheet);
  // Step 3: Member2 attempts to submit member1's timesheet
  await TestValidator.error(
    "should not be able to submit someone else's timesheet",
    async () => {
      await api.functional.hrmTracker.member.timesheets.create(
        member2Connection,
        {
          body: {
            timesheet_id: member1Timesheet.id,
          } satisfies IHrmTrackerTimesheet.ISubmit,
        },
      );
    },
  );
  // Step 4: Verify member1 can still submit their own timesheet (ownership verified)
  await api.functional.hrmTracker.member.timesheets.create(member1Connection, {
    body: {
      timesheet_id: member1Timesheet.id,
    } satisfies IHrmTrackerTimesheet.ISubmit,
  });
}
