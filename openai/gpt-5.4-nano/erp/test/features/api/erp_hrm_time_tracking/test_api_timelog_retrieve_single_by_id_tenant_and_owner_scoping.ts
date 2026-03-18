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

export async function test_api_timelog_retrieve_single_by_id_tenant_and_owner_scoping(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: happy path (member retrieves their own timelog in selected organization)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/signup",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberATimelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberAConnection,
      {
        body: {
          work_date: new Date().toISOString(),
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          note: "Happy path timelog",
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(memberATimelog);
  const retrievedHappy =
    await api.functional.erpHrmTimeTracking.member.timelogs.at(
      memberAConnection,
      {
        timelogId: memberATimelog.id,
      },
    );
  typia.assert(retrievedHappy);

  TestValidator.equals(
    "timelog id matches",
    retrievedHappy.id,
    memberATimelog.id,
  );

  TestValidator.equals(
    "organization id matches",
    (retrievedHappy.organization as unknown as { id: string }).id,
    (memberATimelog.organization as unknown as { id: string }).id,
  );
  TestValidator.equals(
    "employee id matches",
    (retrievedHappy.employee as unknown as { id: string }).id,
    (memberATimelog.employee as unknown as { id: string }).id,
  );
  TestValidator.equals(
    "project id matches",
    (retrievedHappy.project as unknown as { id: string }).id,
    (memberATimelog.project as unknown as { id: string }).id,
  );

  TestValidator.equals("work_date matches", retrievedHappy.work_date, memberATimelog.work_date);
  TestValidator.equals("start_time matches", retrievedHappy.start_time, memberATimelog.start_time);
  TestValidator.equals("end_time matches", retrievedHappy.end_time, memberATimelog.end_time);
  TestValidator.equals(
    "duration_minutes matches",
    retrievedHappy.duration_minutes,
    memberATimelog.duration_minutes,
  );
  TestValidator.equals("note matches", retrievedHappy.note, memberATimelog.note);
  TestValidator.equals(
    "task optionality",
    retrievedHappy.task,
    memberATimelog.task,
  );
  TestValidator.equals(
    "timesheet optionality",
    retrievedHappy.timesheet,
    memberATimelog.timesheet,
  );
  TestValidator.equals("deleted_at is null", retrievedHappy.deleted_at, null);

  // Scenario 3: cross-organization retrieval should be inaccessible
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/signup",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });

  const memberCTimelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberCConnection,
      {
        body: {
          work_date: new Date().toISOString(),
          duration_minutes: 45,
          note: "Member C timelog in another org",
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(memberCTimelog);
  await TestValidator.httpError(
    "should not allow cross-tenant timelog retrieval",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.at(
        memberAConnection,
        { timelogId: memberCTimelog.id },
      );
    },
  );
}
