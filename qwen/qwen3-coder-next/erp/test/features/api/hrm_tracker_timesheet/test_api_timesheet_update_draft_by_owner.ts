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
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_timesheet_update_draft_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and creates organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  const newMemberConnection: api.IConnection = { host: connection.host };
  newMemberConnection.headers = { Authorization: member.token.access };
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      newMemberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Create draft timesheet
  const timesheet = await api.functional.hrmTracker.member.timesheets.create(
    newMemberConnection,
    {
      body: {
        timesheet_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTrackerTimesheet.ISubmit,
    },
  );
  typia.assert(timesheet);
  // 3. Update draft timesheet
  const updated = await api.functional.hrmTracker.member.timesheets.update(
    newMemberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        status: "draft",
        total_hours: (typia.random<number>() satisfies number as number),
      } satisfies IHrmTrackerTimesheet.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate
  TestValidator.equals("status updated", updated.status, "draft");
  TestValidator.predicate("total hours modified", updated.total_hours > 0);
  TestValidator.notEquals(
    "timestamp changed",
    updated.updated_at,
    timesheet.updated_at,
  );
}