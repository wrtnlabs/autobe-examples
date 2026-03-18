import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_me_timesheets_draft_create } from "../../../generate/generate_random_hrm_time_tracking_member_me_timesheets_draft_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_draft_creation_auto_includes_weekly_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const today = new Date();
  const day = today.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + mondayOffset,
    ),
  );
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  const body = {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  } satisfies IHrmTimeTrackingTimesheet.ICreate;
  const timesheet =
    await generate_random_hrm_time_tracking_member_me_timesheets_draft_create(
      authenticatedConnection,
      { body },
    );
  typia.assert(timesheet);
  TestValidator.equals(
    "draft timesheet belongs to the requested Monday-to-Sunday week",
    timesheet.weekStart.slice(0, 10),
    body.weekStart,
  );
  TestValidator.equals(
    "draft timesheet ends on the requested Sunday",
    timesheet.weekEnd.slice(0, 10),
    body.weekEnd,
  );
  TestValidator.equals(
    "draft timesheet is created in draft status",
    timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "draft timesheet has no submission timestamp yet",
    timesheet.submittedAt,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no review timestamp yet",
    timesheet.reviewedAt,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no reviewer yet",
    timesheet.reviewedByEmployee,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no rejection reason yet",
    timesheet.rejectionReason,
    null,
  );
}
