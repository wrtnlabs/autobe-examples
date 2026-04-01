import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
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
import { generate_random_erp_hrm_time_member_timesheets_draft_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_draft_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_draft_creation_isolation_by_organization_context(
  connection: api.IConnection,
): Promise<void> {
  const toMondaySunday = (mondayIso: string): IErpHrmTimeTimesheet.ICreate => {
    const monday = new Date(mondayIso);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 0);
    return {
      weekStartDate: monday.toISOString(),
      weekEndDate: sunday.toISOString(),
    } satisfies IErpHrmTimeTimesheet.ICreate;
  };
  const organizationAConnection: api.IConnection = { host: connection.host };
  const organizationBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(organizationAConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(organizationBConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}-b@example.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberB);
  const draftA = await api.functional.erpHrmTime.member.timesheets.draft.create(
    organizationAConnection,
    {
      body: toMondaySunday("2026-03-02T00:00:00.000Z"),
    },
  );
  typia.assert(draftA);
  const draftB = await api.functional.erpHrmTime.member.timesheets.draft.create(
    organizationBConnection,
    {
      body: toMondaySunday("2026-03-09T00:00:00.000Z"),
    },
  );
  typia.assert(draftB);
  TestValidator.equals("organization A draft status", draftA.status, "draft");
  TestValidator.equals("organization B draft status", draftB.status, "draft");
  TestValidator.equals("organization A submittedAt", draftA.submittedAt, null);
  TestValidator.equals("organization B submittedAt", draftB.submittedAt, null);
  TestValidator.equals("organization A reviewedAt", draftA.reviewedAt, null);
  TestValidator.equals("organization B reviewedAt", draftB.reviewedAt, null);
  TestValidator.equals(
    "organization A rejectionReason",
    draftA.rejectionReason,
    null,
  );
  TestValidator.equals(
    "organization B rejectionReason",
    draftB.rejectionReason,
    null,
  );
  TestValidator.equals(
    "organization A weekStartDate",
    draftA.weekStartDate,
    "2026-03-02T00:00:00.000Z",
  );
  TestValidator.equals(
    "organization A weekEndDate",
    draftA.weekEndDate,
    "2026-03-08T23:59:59.000Z",
  );
  TestValidator.equals(
    "organization B weekStartDate",
    draftB.weekStartDate,
    "2026-03-09T00:00:00.000Z",
  );
  TestValidator.equals(
    "organization B weekEndDate",
    draftB.weekEndDate,
    "2026-03-15T23:59:59.000Z",
  );
  TestValidator.notEquals(
    "draft ids must differ across organizations",
    draftA.id,
    draftB.id,
  );
  TestValidator.notEquals(
    "employee ownership must remain organization scoped",
    draftA.employee,
    draftB.employee,
  );
  TestValidator.equals(
    "organization A draft timelog count",
    draftA.timesheetTimelogs.length,
    0,
  );
  TestValidator.equals(
    "organization B draft timelog count",
    draftB.timesheetTimelogs.length,
    0,
  );
}
