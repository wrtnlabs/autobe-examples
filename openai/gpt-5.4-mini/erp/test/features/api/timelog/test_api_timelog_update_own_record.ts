import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";

export async function test_api_timelog_update_own_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const created = await generate_random_erp_hrm_time_member_timelogs_create(
    memberConnection,
    {
      body: {
        workDate: new Date().toISOString(),
        durationMinutes: 30,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies Partial<IErpHrmTimeTimelog.ICreate> as never,
    },
  );
  typia.assert(created);
  const updateBody = {
    work_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    duration_minutes: 45,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: false,
  } satisfies IErpHrmTimeTimelog.IUpdate;
  const updated = await api.functional.erpHrmTime.member.timelogs.update(
    memberConnection,
    {
      timelogId: created.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "timelog id should remain the same",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "member ownership should remain the same",
    updated.member,
    created.member,
  );
  TestValidator.equals(
    "project should remain the same when not updated",
    updated.project,
    created.project,
  );
  TestValidator.equals(
    "work date should update",
    updated.workDate,
    updateBody.work_date,
  );
  TestValidator.equals(
    "duration should update",
    updated.durationMinutes,
    updateBody.duration_minutes,
  );
  TestValidator.equals(
    "description should update",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "billable should update",
    updated.billable,
    updateBody.billable,
  );
  TestValidator.notEquals(
    "updatedAt should change after update",
    updated.updatedAt,
    created.updatedAt,
  );
  TestValidator.equals(
    "createdAt should remain unchanged",
    updated.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "deletedAt should remain null",
    updated.deletedAt,
    created.deletedAt,
  );
}
