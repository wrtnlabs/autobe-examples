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

export async function test_api_timesheet_update_owned_record(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = typia.random<string & tags.Format<"password">>();
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const originalWeekStartDate = new Date("2026-03-30T00:00:00.000Z");
  const originalWeekEndDate = new Date("2026-04-05T23:59:59.999Z");
  const timesheet = await api.functional.erpHrmTime.member.timesheets.create(
    ownerConnection,
    {
      body: {
        weekStartDate: originalWeekStartDate.toISOString(),
        weekEndDate: originalWeekEndDate.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  const originalId = timesheet.id;
  const originalEmployee = timesheet.employee;
  const originalTimelogs = timesheet.timesheetTimelogs;
  const originalCreatedAt = timesheet.createdAt;
  const originalUpdatedAt = timesheet.updatedAt;
  const updatedWeekStartDate = new Date("2026-03-30T00:00:00.000Z");
  const updatedWeekEndDate = new Date("2026-04-05T23:59:59.999Z");
  const updated = await api.functional.erpHrmTime.member.timesheets.update(
    ownerConnection,
    {
      timesheetId: timesheet.id,
      body: {
        weekStartDate: updatedWeekStartDate.toISOString(),
        weekEndDate: updatedWeekEndDate.toISOString(),
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "timesheet id should remain unchanged",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "ownership should remain unchanged",
    updated.employee,
    originalEmployee,
  );
  TestValidator.equals(
    "timelog associations should be preserved",
    updated.timesheetTimelogs,
    originalTimelogs,
  );
  TestValidator.equals(
    "createdAt should remain unchanged",
    updated.createdAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "week start date should remain coherent",
    updated.weekStartDate,
    updatedWeekStartDate.toISOString(),
  );
  TestValidator.equals(
    "week end date should remain coherent",
    updated.weekEndDate,
    updatedWeekEndDate.toISOString(),
  );
  TestValidator.predicate(
    "updatedAt should be present",
    updated.updatedAt.length > 0,
  );
  TestValidator.notEquals(
    "update should touch the record timestamp or keep model consistent",
    updated.updatedAt,
    originalUpdatedAt,
  );
  const otherConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/other-onboarding",
      referrer: "https://example.com/other-landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(otherMember);
  await TestValidator.error(
    "cross-organization update should be denied",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.update(
        otherConnection,
        {
          timesheetId: originalId,
          body: {
            status: "approved",
          } satisfies IErpHrmTimeTimesheet.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "original timesheet id remains stable for owner context",
    timesheet.id,
    originalId,
  );
}
