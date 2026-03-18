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

export async function test_api_timelog_retrieve_optional_task_and_timesheet_projection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: `org_${RandomGenerator.alphabets(10)}`,
      organizationDescription: `org_desc_${RandomGenerator.alphabets(10)}`,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: authorized.token.access };
  const createdTimelogs: IErpHrmTimeTrackingTimelog[] = [];
  for (let i = 0; i < 6; i++) {
    const created =
      await generate_random_erp_hrm_time_tracking_member_timelogs_create(
        authConnection,
        {},
      );
    typia.assert(created);
    createdTimelogs.push(created);
  }
  const t1Source = createdTimelogs.find(
    (t) => t.task !== null && t.timesheet === null,
  );
  const t2Source = createdTimelogs.find(
    (t) => t.task === null && t.timesheet !== null,
  );
  if (!t1Source)
    throw new Error("Failed to generate T1 (task present, timesheet absent)");
  if (!t2Source)
    throw new Error("Failed to generate T2 (task absent, timesheet present)");
  const fetchedT1 = await api.functional.erpHrmTimeTracking.member.timelogs.at(
    authConnection,
    { timelogId: t1Source.id },
  );
  typia.assert(fetchedT1);
  TestValidator.equals(
    "T1 task id matches",
    fetchedT1.task?.id ?? null,
    t1Source.task?.id ?? null,
  );
  TestValidator.equals("T1 timesheet is null", fetchedT1.timesheet, null);
  TestValidator.equals(
    "T1 project id matches",
    fetchedT1.project.id,
    t1Source.project.id,
  );
  TestValidator.equals(
    "T1 duration matches",
    fetchedT1.duration_minutes,
    t1Source.duration_minutes,
  );
  const fetchedT2 = await api.functional.erpHrmTimeTracking.member.timelogs.at(
    authConnection,
    { timelogId: t2Source.id },
  );
  typia.assert(fetchedT2);
  TestValidator.equals("T2 task is null", fetchedT2.task, null);
  TestValidator.equals(
    "T2 timesheet id matches",
    fetchedT2.timesheet?.id ?? null,
    t2Source.timesheet?.id ?? null,
  );
  TestValidator.equals(
    "T2 project id matches",
    fetchedT2.project.id,
    t2Source.project.id,
  );
  TestValidator.equals(
    "T2 duration matches",
    fetchedT2.duration_minutes,
    t2Source.duration_minutes,
  );
  // Scenario 2: create timelog with both task and timesheet populated
  const t3Source =
    createdTimelogs.find((t) => t.task !== null && t.timesheet !== null) ??
    (await (async () => {
      for (let i = 0; i < 6; i++) {
        const created =
          await generate_random_erp_hrm_time_tracking_member_timelogs_create(
            authConnection,
            {},
          );
        typia.assert(created);
        if (created.task !== null && created.timesheet !== null) return created;
      }
      throw new Error("Failed to generate T3 (task and timesheet present)");
    })());
  const fetchedT3 = await api.functional.erpHrmTimeTracking.member.timelogs.at(
    authConnection,
    { timelogId: t3Source.id },
  );
  typia.assert(fetchedT3);
  TestValidator.equals(
    "T3 project id matches",
    fetchedT3.project.id,
    t3Source.project.id,
  );
  TestValidator.equals(
    "T3 task id matches",
    fetchedT3.task?.id ?? null,
    t3Source.task?.id ?? null,
  );
  TestValidator.equals(
    "T3 timesheet id matches",
    fetchedT3.timesheet?.id ?? null,
    t3Source.timesheet?.id ?? null,
  );
  TestValidator.equals(
    "T3 duration matches",
    fetchedT3.duration_minutes,
    t3Source.duration_minutes,
  );
}
