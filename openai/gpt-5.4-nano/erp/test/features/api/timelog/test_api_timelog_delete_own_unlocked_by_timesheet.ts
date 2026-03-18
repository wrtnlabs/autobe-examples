import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";

export async function test_api_timelog_delete_own_unlocked_by_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password: "Password123!",
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // 2) Create an owned, unlocked timelog (no timesheet linkage)
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelog);
  // 3) Delete the timelog
  await api.functional.erpHrmTimeTracking.member.timelogs.erase(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  // 4) Post-check: deleting again should fail (timelog should be gone)
  await TestValidator.error(
    "deleting the same timelog again should fail",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.erase(
        memberConnection,
        {
          timelogId: timelog.id,
        },
      );
    },
  );
}
