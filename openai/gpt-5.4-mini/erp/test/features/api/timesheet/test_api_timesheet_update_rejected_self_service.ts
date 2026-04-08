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

export async function test_api_timesheet_update_rejected_self_service(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/erp-hrm-time/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const monday = new Date("2026-03-30T00:00:00.000Z");
  const sunday = new Date("2026-04-05T00:00:00.000Z");
  const nextMonday = new Date("2026-04-06T00:00:00.000Z");
  const nextSunday = new Date("2026-04-12T00:00:00.000Z");
  const draft = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(draft);
  const rejected = await api.functional.erpHrmTime.member.timesheets.update(
    memberConnection,
    {
      timesheetId: draft.id,
      body: {
        status: "rejected",
        reviewedAt: new Date("2026-04-02T00:00:00.000Z").toISOString(),
        reviewedByMemberId: member.id,
        rejectionReason: "Need revision before approval",
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(rejected);
  TestValidator.equals("rejected status", rejected.status, "rejected");
  TestValidator.equals(
    "rejection reason preserved",
    rejected.rejectionReason,
    "Need revision before approval",
  );
  TestValidator.predicate(
    "review metadata is present after rejection",
    rejected.reviewedAt !== null && rejected.reviewedByMember !== null,
  );
  TestValidator.predicate(
    "linked timelogs remain accessible",
    Array.isArray(rejected.timesheetTimelogs),
  );
  const reopened = await api.functional.erpHrmTime.member.timesheets.update(
    memberConnection,
    {
      timesheetId: rejected.id,
      body: {
        status: "draft",
        weekStartDate: nextMonday.toISOString(),
        weekEndDate: nextSunday.toISOString(),
        reviewedAt: null,
        reviewedByMemberId: null,
        rejectionReason: null,
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(reopened);
  TestValidator.equals("reopened status", reopened.status, "draft");
  TestValidator.equals(
    "week start updated coherently",
    reopened.weekStartDate,
    nextMonday.toISOString(),
  );
  TestValidator.equals(
    "week end updated coherently",
    reopened.weekEndDate,
    nextSunday.toISOString(),
  );
  TestValidator.equals("reviewedAt cleared", reopened.reviewedAt, null);
  TestValidator.equals(
    "reviewedByMember cleared",
    reopened.reviewedByMember,
    null,
  );
  TestValidator.equals(
    "rejection reason cleared",
    reopened.rejectionReason,
    null,
  );
  TestValidator.equals(
    "linked timelog count preserved after reopen",
    reopened.timesheetTimelogs.length,
    rejected.timesheetTimelogs.length,
  );
  const updatedAgain = await api.functional.erpHrmTime.member.timesheets.update(
    memberConnection,
    {
      timesheetId: reopened.id,
      body: {
        rejectionReason: null,
        reviewedAt: null,
        reviewedByMemberId: null,
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(updatedAgain);
  TestValidator.equals(
    "editable state remains draft",
    updatedAgain.status,
    "draft",
  );
  TestValidator.equals(
    "final week start remains coherent",
    updatedAgain.weekStartDate,
    nextMonday.toISOString(),
  );
  TestValidator.equals(
    "final week end remains coherent",
    updatedAgain.weekEndDate,
    nextSunday.toISOString(),
  );
  TestValidator.equals(
    "final rejection reason cleared",
    updatedAgain.rejectionReason,
    null,
  );
  TestValidator.equals(
    "final reviewedAt cleared",
    updatedAgain.reviewedAt,
    null,
  );
  TestValidator.equals(
    "final reviewedByMember cleared",
    updatedAgain.reviewedByMember,
    null,
  );
}
