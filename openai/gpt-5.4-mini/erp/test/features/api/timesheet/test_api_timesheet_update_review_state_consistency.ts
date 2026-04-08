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

export async function test_api_timesheet_update_review_state_consistency(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const approverConnection: api.IConnection = { host: connection.host };
  const outsiderConnection: api.IConnection = { host: connection.host };
  const ownerEmail: string = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const approverEmail: string = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const outsiderEmail: string = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time/signup",
      referrer: "https://example.com/erp/hrm/time",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const approverAuthorized = await authorize_member_join(approverConnection, {
    body: {
      email: approverEmail,
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time/signup",
      referrer: "https://example.com/erp/hrm/time",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(approverAuthorized);
  const outsiderAuthorized = await authorize_member_join(outsiderConnection, {
    body: {
      email: outsiderEmail,
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time/signup",
      referrer: "https://example.com/erp/hrm/time",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsiderAuthorized);
  const firstWeekStart = new Date("2026-03-30T00:00:00.000Z");
  const firstWeekEnd = new Date("2026-04-05T23:59:59.999Z");
  const secondWeekStart = new Date("2026-04-06T00:00:00.000Z");
  const secondWeekEnd = new Date("2026-04-12T23:59:59.999Z");
  const created = await generate_random_erp_hrm_time_member_timesheets_create(
    ownerConnection,
    {
      body: {
        weekStartDate: firstWeekStart.toISOString(),
        weekEndDate: firstWeekEnd.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(created);
  const submitted = await api.functional.erpHrmTime.member.timesheets.update(
    ownerConnection,
    {
      timesheetId: created.id,
      body: {
        status: "submitted",
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedByMemberId: null,
        rejectionReason: null,
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(submitted);
  TestValidator.equals("submitted status", submitted.status, "submitted");
  TestValidator.equals(
    "submitted reviewedAt cleared",
    submitted.reviewedAt,
    null,
  );
  TestValidator.equals(
    "submitted reviewer cleared",
    submitted.reviewedByMember,
    null,
  );
  TestValidator.equals(
    "submitted rejection reason cleared",
    submitted.rejectionReason,
    null,
  );
  const approved = await api.functional.erpHrmTime.member.timesheets.update(
    approverConnection,
    {
      timesheetId: created.id,
      body: {
        status: "approved",
        reviewedAt: new Date().toISOString(),
        reviewedByMemberId: approverAuthorized.id,
        rejectionReason: null,
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(approved);
  TestValidator.equals("approved status", approved.status, "approved");
  TestValidator.predicate(
    "approved reviewedAt exists",
    approved.reviewedAt !== null,
  );
  TestValidator.predicate(
    "approved reviewer exists",
    approved.reviewedByMember !== null,
  );
  TestValidator.equals(
    "approved rejection reason cleared",
    approved.rejectionReason,
    null,
  );
  const rejectedCandidate =
    await generate_random_erp_hrm_time_member_timesheets_create(
      ownerConnection,
      {
        body: {
          weekStartDate: secondWeekStart.toISOString(),
          weekEndDate: secondWeekEnd.toISOString(),
        } satisfies IErpHrmTimeTimesheet.ICreate,
      },
    );
  typia.assert(rejectedCandidate);
  const rejectedSubmitted =
    await api.functional.erpHrmTime.member.timesheets.update(ownerConnection, {
      timesheetId: rejectedCandidate.id,
      body: {
        status: "submitted",
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedByMemberId: null,
        rejectionReason: null,
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    });
  typia.assert(rejectedSubmitted);
  const rejected = await api.functional.erpHrmTime.member.timesheets.update(
    approverConnection,
    {
      timesheetId: rejectedCandidate.id,
      body: {
        status: "rejected",
        reviewedAt: new Date().toISOString(),
        reviewedByMemberId: approverAuthorized.id,
        rejectionReason: "Insufficient detail provided",
      } satisfies IErpHrmTimeTimesheet.IUpdate,
    },
  );
  typia.assert(rejected);
  TestValidator.equals("rejected status", rejected.status, "rejected");
  TestValidator.predicate(
    "rejected reviewedAt exists",
    rejected.reviewedAt !== null,
  );
  TestValidator.predicate(
    "rejected reviewer exists",
    rejected.reviewedByMember !== null,
  );
  TestValidator.equals(
    "rejected reason persisted",
    rejected.rejectionReason,
    "Insufficient detail provided",
  );
  await TestValidator.error("reject without reason should fail", async () => {
    await api.functional.erpHrmTime.member.timesheets.update(
      approverConnection,
      {
        timesheetId: rejectedCandidate.id,
        body: {
          status: "rejected",
          reviewedAt: new Date().toISOString(),
          reviewedByMemberId: approverAuthorized.id,
        } satisfies IErpHrmTimeTimesheet.IUpdate,
      },
    );
  });
  await TestValidator.error(
    "unauthorized member should not update timesheet",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.update(
        outsiderConnection,
        {
          timesheetId: created.id,
          body: {
            status: "approved",
            reviewedAt: new Date().toISOString(),
            reviewedByMemberId: outsiderAuthorized.id,
            rejectionReason: null,
          } satisfies IErpHrmTimeTimesheet.IUpdate,
        },
      );
    },
  );
}
