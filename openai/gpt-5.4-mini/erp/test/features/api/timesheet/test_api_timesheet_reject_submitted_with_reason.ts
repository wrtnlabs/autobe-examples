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
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_reject_submitted_with_reason(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const approverConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time/owner",
      referrer: "https://example.com/erp/hrm/time/signup",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const approver = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time/approver",
      referrer: "https://example.com/erp/hrm/time/signup",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(approver);
  const now = new Date();
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const draft = await generate_random_erp_hrm_time_member_timesheets_create(
    ownerConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(draft);
  TestValidator.equals(
    "draft week start",
    draft.weekStartDate,
    monday.toISOString(),
  );
  TestValidator.equals(
    "draft week end",
    draft.weekEndDate,
    sunday.toISOString(),
  );
  const submitted = await api.functional.erpHrmTime.member.timesheets.submit(
    ownerConnection,
    {
      timesheetId: draft.id,
    },
  );
  typia.assert(submitted);
  TestValidator.equals("submitted timesheet id", submitted.id, draft.id);
  TestValidator.predicate("submitted status", submitted.status === "submitted");
  TestValidator.predicate(
    "submitted contains timelogs",
    submitted.timesheetTimelogs.length >= 0,
  );
  const beforeRejectTimelogIds = submitted.timesheetTimelogs.map(
    (item) => item.timelog.id,
  );
  const rejection = await api.functional.erpHrmTime.member.timesheets.reject(
    approverConnection,
    {
      timesheetId: submitted.id,
      body: {
        rejectionReason: true,
      } satisfies IErpHrmTimeTimesheet.IReject,
    },
  );
  typia.assert(rejection);
  TestValidator.equals("rejected timesheet id", rejection.id, submitted.id);
  TestValidator.equals("status returned to draft", rejection.status, "draft");
  TestValidator.equals(
    "week start preserved",
    rejection.weekStartDate,
    submitted.weekStartDate,
  );
  TestValidator.equals(
    "week end preserved",
    rejection.weekEndDate,
    submitted.weekEndDate,
  );
  TestValidator.notEquals("reviewed at populated", rejection.reviewedAt, null);
  TestValidator.notEquals(
    "reviewed by populated",
    rejection.reviewedByMember,
    null,
  );
  TestValidator.notEquals(
    "rejection reason stored",
    rejection.rejectionReason,
    null,
  );
  TestValidator.equals(
    "timelog count preserved",
    rejection.timesheetTimelogs.length,
    submitted.timesheetTimelogs.length,
  );
  TestValidator.equals(
    "timelog ids preserved",
    rejection.timesheetTimelogs.map((item) => item.timelog.id),
    beforeRejectTimelogIds,
  );
  const resubmitted = await api.functional.erpHrmTime.member.timesheets.submit(
    ownerConnection,
    {
      timesheetId: rejection.id,
    },
  );
  typia.assert(resubmitted);
  TestValidator.equals("resubmitted id", resubmitted.id, rejection.id);
  TestValidator.predicate(
    "resubmitted status",
    resubmitted.status === "submitted",
  );
}
