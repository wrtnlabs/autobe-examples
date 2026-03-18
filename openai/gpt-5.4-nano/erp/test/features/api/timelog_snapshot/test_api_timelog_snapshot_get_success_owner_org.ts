import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create";
import { prepare_random_erp_hrm_time_tracking_timelog_snapshot } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog_snapshot";

export async function test_api_timelog_snapshot_get_success_owner_org(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/href" satisfies string & tags.Format<"uri">,
    referrer:
      "https://example.com/referrer" satisfies string &
        tags.Format<"uri">,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;

  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);

  const create = await generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
    memberConnection,
    ({ body: await prepare_random_erp_hrm_time_tracking_timelog_snapshot() } satisfies any),
  );
  typia.assert(create);

  const fetched = await api.functional.erpHrmTimeTracking.member.timelogSnapshots.at(
    memberConnection,
    {
      timelogSnapshotId: create.id,
    },
  );
  typia.assert(fetched);

  TestValidator.equals("timelog snapshot id matches", fetched.id, create.id);
  TestValidator.equals(
    "organization_id matches",
    fetched.organization_id,
    create.organization_id,
  );
  TestValidator.equals(
    "employee_id matches",
    fetched.employee_id,
    create.employee_id,
  );
  TestValidator.equals(
    "project_id matches",
    fetched.project_id,
    create.project_id,
  );
  TestValidator.equals("task_id matches", fetched.task_id, create.task_id);
  TestValidator.equals(
    "timesheet_id matches",
    fetched.timesheet_id,
    create.timesheet_id,
  );
  TestValidator.equals(
    "started_at matches",
    fetched.started_at,
    create.started_at,
  );
  TestValidator.equals("ended_at matches", fetched.ended_at, create.ended_at);
  TestValidator.equals(
    "duration_minutes matches",
    fetched.duration_minutes,
    create.duration_minutes,
  );
  TestValidator.equals(
    "work_description matches",
    fetched.work_description,
    create.work_description,
  );
  TestValidator.equals(
    "workflow_status matches",
    fetched.workflow_status,
    create.workflow_status,
  );
  TestValidator.equals(
    "created_at unchanged",
    fetched.created_at,
    create.created_at,
  );
  TestValidator.equals(
    "updated_at unchanged",
    fetched.updated_at,
    create.updated_at,
  );
}
