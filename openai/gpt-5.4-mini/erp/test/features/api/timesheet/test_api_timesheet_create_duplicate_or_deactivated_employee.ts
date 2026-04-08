import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_create_duplicate_or_deactivated_employee(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erpHrmTime/auth/member/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorization);
  const activeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorization.token.access,
    },
  };
  const now: Date = new Date();
  const utcDay: number = now.getUTCDay();
  const mondayOffset: number = (utcDay + 6) % 7;
  const monday: Date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - mondayOffset,
      0,
      0,
      0,
      0,
    ),
  );
  const sunday: Date = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate() + 6,
      23,
      59,
      59,
      999,
    ),
  );
  const body = {
    weekStartDate: monday.toISOString(),
    weekEndDate: sunday.toISOString(),
  } satisfies IErpHrmTimeTimesheet.ICreate;
  const first = await api.functional.erpHrmTime.member.timesheets.create(
    activeConnection,
    {
      body,
    },
  );
  typia.assert(first);
  TestValidator.equals("created timesheet status", first.status, "draft");
  TestValidator.equals(
    "created timesheet week start",
    first.weekStartDate,
    body.weekStartDate,
  );
  TestValidator.equals(
    "created timesheet week end",
    first.weekEndDate,
    body.weekEndDate,
  );
  TestValidator.equals(
    "created timesheet has no reviewer",
    first.reviewedByMember,
    null,
  );
  TestValidator.equals(
    "created timesheet has no review timestamp",
    first.reviewedAt,
    null,
  );
  TestValidator.equals(
    "created timesheet has no submission timestamp",
    first.submittedAt,
    null,
  );
  await TestValidator.error(
    "duplicate timesheet creation for same employee and week should fail",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.create(
        activeConnection,
        {
          body,
        },
      );
    },
  );
}
