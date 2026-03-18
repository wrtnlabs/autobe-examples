import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_timesheets_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_owner_timesheets_snapshots_create";
import { prepare_random_hrm_time_tracking_timesheet_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_snapshot";

export async function test_api_timesheet_snapshot_create_locked_audit_record(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId,
        },
        body: {
          locked: true,
        } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot id must be distinct from parent timesheet id",
    snapshot.id,
    snapshot.timesheet.id,
  );
  TestValidator.equals(
    "snapshot parent timesheet matches route parameter",
    snapshot.timesheet.id,
    timesheetId,
  );
  TestValidator.equals(
    "snapshot stores locked flag exactly as submitted",
    snapshot.locked,
    true,
  );
  TestValidator.equals(
    "embedded parent timesheet remains linked to requested id",
    snapshot.timesheet.id,
    timesheetId,
  );
  TestValidator.predicate(
    "embedded parent timesheet status is present",
    snapshot.timesheet.status.length > 0,
  );
}
