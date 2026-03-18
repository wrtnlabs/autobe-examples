import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheetSnapshot";
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
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_owner_organizations_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_invitations_create";
import { generate_random_hrm_time_tracking_owner_timesheets_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_owner_timesheets_snapshots_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_organization_invitation";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_snapshot";

export async function test_api_timesheet_snapshot_history_owner_cross_organization_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerOneConnection: api.IConnection = { host: connection.host };
  const ownerOneEmail = typia.random<string & tags.Format<"email">>();
  const ownerOneJoin = await authorize_owner_join(ownerOneConnection, {
    body: {
      email: ownerOneEmail,
    },
  });
  typia.assert(ownerOneJoin);
  const ownerOneOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerOneConnection,
      {},
    );
  typia.assert(ownerOneOrganization);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerOneConnection,
      {
        params: {
          organizationId: ownerOneOrganization.id,
        },
        body: {
          email: employeeEmail,
          message: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation organization matches owner one organization",
    invitation.organization.id,
    ownerOneOrganization.id,
  );
  TestValidator.equals(
    "invitation email matches employee email",
    invitation.email,
    employeeEmail,
  );
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeJoin = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
    },
  });
  typia.assert(employeeJoin);
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  TestValidator.equals(
    "timesheet belongs to invited employee",
    timesheet.employee.email,
    employeeEmail,
  );
  TestValidator.equals(
    "timesheet organization matches owner one organization",
    timesheet.organization.id,
    ownerOneOrganization.id,
  );
  const snapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerOneConnection,
      {
        params: {
          timesheetId: timesheet.id,
        },
        body: {
          locked: false,
        },
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot parent timesheet matches created timesheet",
    snapshot.timesheet.id,
    timesheet.id,
  );
  const ownerTwoConnection: api.IConnection = { host: connection.host };
  const ownerTwoEmail = typia.random<string & tags.Format<"email">>();
  const ownerTwoJoin = await authorize_owner_join(ownerTwoConnection, {
    body: {
      email: ownerTwoEmail,
    },
  });
  typia.assert(ownerTwoJoin);
  const ownerTwoOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerTwoConnection,
      {},
    );
  typia.assert(ownerTwoOrganization);
  TestValidator.notEquals(
    "owner organizations are isolated",
    ownerTwoOrganization.id,
    ownerOneOrganization.id,
  );
  await TestValidator.httpError(
    "foreign owner cannot read snapshot history from another organization",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.owner.timesheets.snapshots.index(
        ownerTwoConnection,
        {
          timesheetId: timesheet.id,
          body: {
            page: 1,
            limit: 10,
            sort: "-id",
          },
        },
      );
    },
  );
}
