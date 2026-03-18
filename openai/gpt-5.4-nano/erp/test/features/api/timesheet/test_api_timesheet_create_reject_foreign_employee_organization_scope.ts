import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timesheet_create_reject_foreign_employee_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberAPassword = `p@ss-${RandomGenerator.alphabets(10)}`;
  const memberBPassword = `p@ss-${RandomGenerator.alphabets(10)}`;
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      organizationName: RandomGenerator.paragraph({ sentences: 1 }),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(12)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(12)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const joinB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      organizationName: RandomGenerator.paragraph({ sentences: 1 }),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 2,
      href: `https://example.com/${RandomGenerator.alphabets(12)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(12)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinB);
  const foreignEmployeeTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberBConnection,
      {
        body: {
          week_start_at: new Date().toISOString(),
          week_end_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: joinB.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(foreignEmployeeTimesheet);
  const foreignEmployeeId =
    foreignEmployeeTimesheet.erpHrmTimeTrackingEmployeeId;
  const weekStartAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const weekEndAt = new Date(
    Date.now() + 21 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await TestValidator.error(
    "reject foreign employee timesheet creation across organizations",
    async () => {
      const created =
        await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
          memberAConnection,
          {
            body: {
              week_start_at: weekStartAt,
              week_end_at: weekEndAt,
              status: "draft",
              erp_hrm_time_tracking_employee_id: foreignEmployeeId,
              submitted_at: null,
              approved_at: null,
              rejected_at: null,
            } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
          },
        );
      typia.assert(created);
    },
  );
}
