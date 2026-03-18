import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_owner_timesheets_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_owner_timesheets_snapshots_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_snapshot";

export async function test_api_timesheet_snapshot_detail_parent_pairing_not_found(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeJoin = await authorize_employee_join(employeeJoinConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeJoin);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeLogin = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.ILogin,
  });
  typia.assert(employeeLogin);
  const firstTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  const secondTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date("2024-01-08T00:00:00.000Z").toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(secondTimesheet);
  TestValidator.notEquals(
    "timesheets must be different parents",
    firstTimesheet.id,
    secondTimesheet.id,
  );
  const snapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId: firstTimesheet.id,
        },
        body: {
          locked: RandomGenerator.pick([true, false] as const),
        } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot belongs to first timesheet",
    snapshot.timesheet.id,
    firstTimesheet.id,
  );
  TestValidator.notEquals(
    "snapshot parent differs from second timesheet",
    snapshot.timesheet.id,
    secondTimesheet.id,
  );
  await TestValidator.httpError(
    "mismatched parent-child pairing must not resolve snapshot detail",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.timesheets.snapshots.at(
        ownerConnection,
        {
          timesheetId: secondTimesheet.id,
          timesheetSnapshotId: snapshot.id,
        },
      );
    },
  );
}
