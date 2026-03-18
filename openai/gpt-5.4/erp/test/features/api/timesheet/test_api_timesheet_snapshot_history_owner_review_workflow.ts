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

export async function test_api_timesheet_snapshot_history_owner_review_workflow(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = "OwnerTest1234!";
  const ownerJoin = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: ownerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(ownerJoin);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: employeeEmail,
          message: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation organization matches",
    invitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    employeeEmail,
  );
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeePassword = "EmployeeTest1234!";
  const employeeJoin = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeJoin);
  const mondayWeekStart = new Date("2026-03-02T00:00:00.000Z").toISOString();
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: mondayWeekStart,
        },
      },
    );
  typia.assert(timesheet);
  TestValidator.equals(
    "timesheet organization matches",
    timesheet.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "timesheet employee matches",
    timesheet.employee.id,
    employeeJoin.id,
  );
  TestValidator.equals("timesheet starts draft", timesheet.status, "draft");
  const submitted =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet id unchanged",
    submitted.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timesheet submitted status",
    submitted.status,
    "submitted",
  );
  const rejected = await api.functional.hrmTimeTracking.owner.timesheets.reject(
    ownerConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: null,
      } satisfies IHrmTimeTrackingTimesheet.IReject,
    },
  );
  typia.assert(rejected);
  TestValidator.equals(
    "rejected timesheet id unchanged",
    rejected.id,
    timesheet.id,
  );
  TestValidator.equals("timesheet returned to draft", rejected.status, "draft");
  TestValidator.equals(
    "submission timestamp preserved after rejection",
    rejected.submitted_at,
    submitted.submitted_at,
  );
  TestValidator.equals(
    "timelog count preserved after rejection",
    rejected.timelogs.length,
    submitted.timelogs.length,
  );
  TestValidator.equals(
    "total hours preserved after rejection",
    rejected.total_hours,
    submitted.total_hours,
  );
  const createdSnapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId: timesheet.id,
        },
        body: {
          locked: false,
        },
      },
    );
  typia.assert(createdSnapshot);
  TestValidator.equals(
    "snapshot parent timesheet matches",
    createdSnapshot.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals("snapshot locked state", createdSnapshot.locked, false);
  const beforeListId = rejected.id;
  const beforeListStatus = rejected.status;
  const beforeListSubmittedAt = rejected.submitted_at;
  const beforeListReviewedAt = rejected.reviewed_at;
  const beforeListRejectionReason = rejected.rejection_reason;
  const beforeListTimelogCount = rejected.timelogs.length;
  const beforeListTotalHours = rejected.total_hours;
  const page =
    await api.functional.hrmTimeTracking.owner.timesheets.snapshots.index(
      ownerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          page: 1,
          limit: 10,
          sort: "+id",
        } satisfies IHrmTimeTrackingTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count covers returned rows",
    page.pagination.records >= page.data.length,
  );
  TestValidator.predicate(
    "pagination pages zero only when no records",
    page.pagination.records === 0
      ? page.pagination.pages === 0
      : page.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "snapshot page contains created snapshot",
    ArrayUtil.has(page.data, (snapshot) => snapshot.id === createdSnapshot.id),
  );
  const listedSnapshot = page.data.find(
    (snapshot) => snapshot.id === createdSnapshot.id,
  );
  const safeListedSnapshot = typia.assert(listedSnapshot!);
  TestValidator.equals(
    "listed snapshot locked value matches created snapshot",
    safeListedSnapshot.locked,
    createdSnapshot.locked,
  );
  TestValidator.equals(
    "read only keeps timesheet id",
    rejected.id,
    beforeListId,
  );
  TestValidator.equals(
    "read only keeps timesheet status",
    rejected.status,
    beforeListStatus,
  );
  TestValidator.equals(
    "read only keeps submitted_at",
    rejected.submitted_at,
    beforeListSubmittedAt,
  );
  TestValidator.equals(
    "read only keeps reviewed_at",
    rejected.reviewed_at,
    beforeListReviewedAt,
  );
  TestValidator.equals(
    "read only keeps rejection reason",
    rejected.rejection_reason,
    beforeListRejectionReason,
  );
  TestValidator.equals(
    "read only keeps timelog count",
    rejected.timelogs.length,
    beforeListTimelogCount,
  );
  TestValidator.equals(
    "read only keeps total hours",
    rejected.total_hours,
    beforeListTotalHours,
  );
}
