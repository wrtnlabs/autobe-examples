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

export async function test_api_timesheet_snapshot_history_owner_after_approval(
  connection: api.IConnection,
): Promise<void> {
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = typia.random<string & tags.Format<"password">>();
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_owner_join(ownerJoinConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(ownerAuthorized);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerJoinConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerJoinConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: employeeEmail,
          message: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingOrganizationInvitation.ICreate,
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
  const employeeJoinConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_employee_join(
    employeeJoinConnection,
    {
      body: {
        email: employeeEmail,
        password: employeePassword,
        href,
        referrer,
        ip,
      },
    },
  );
  typia.assert(employeeAuthorized);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerLogin = await authorize_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IHrmTimeTrackingOwner.ILogin,
  });
  typia.assert(ownerLogin);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeLogin = await authorize_employee_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href,
      referrer,
      ip,
    } satisfies IHrmTimeTrackingEmployee.ILogin,
  });
  typia.assert(employeeLogin);
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: "2026-03-09T00:00:00.000Z",
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  TestValidator.equals(
    "draft timesheet organization matches",
    timesheet.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "draft timesheet employee matches",
    timesheet.employee.email,
    employeeEmail,
  );
  TestValidator.equals("draft timesheet status", timesheet.status, "draft");
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
    "submitted organization unchanged",
    submitted.organization.id,
    timesheet.organization.id,
  );
  TestValidator.equals(
    "submitted employee unchanged",
    submitted.employee.id,
    timesheet.employee.id,
  );
  TestValidator.notEquals(
    "status changed from draft",
    submitted.status,
    timesheet.status,
  );
  TestValidator.predicate(
    "submitted_at is recorded",
    submitted.submitted_at !== null,
  );
  const preApprovalSnapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId: submitted.id,
        },
        body: {
          locked: false,
        } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate,
      },
    );
  typia.assert(preApprovalSnapshot);
  TestValidator.equals(
    "pre-approval snapshot parent timesheet id",
    preApprovalSnapshot.timesheet.id,
    submitted.id,
  );
  TestValidator.equals(
    "pre-approval snapshot unlocked",
    preApprovalSnapshot.locked,
    false,
  );
  const approved =
    await api.functional.hrmTimeTracking.owner.timesheets.approve(
      ownerConnection,
      {
        timesheetId: submitted.id,
      },
    );
  typia.assert(approved);
  TestValidator.equals(
    "approved timesheet id unchanged",
    approved.id,
    submitted.id,
  );
  TestValidator.equals(
    "approved organization unchanged",
    approved.organization.id,
    submitted.organization.id,
  );
  TestValidator.equals(
    "approved employee unchanged",
    approved.employee.id,
    submitted.employee.id,
  );
  TestValidator.equals("approved status", approved.status, "approved");
  TestValidator.predicate(
    "reviewed_at is recorded",
    approved.reviewed_at !== null,
  );
  const postApprovalSnapshot =
    await generate_random_hrm_time_tracking_owner_timesheets_snapshots_create(
      ownerConnection,
      {
        params: {
          timesheetId: approved.id,
        },
        body: {
          locked: true,
        } satisfies IHrmTimeTrackingTimesheetSnapshot.ICreate,
      },
    );
  typia.assert(postApprovalSnapshot);
  TestValidator.equals(
    "post-approval snapshot parent timesheet id",
    postApprovalSnapshot.timesheet.id,
    approved.id,
  );
  TestValidator.equals(
    "post-approval snapshot locked",
    postApprovalSnapshot.locked,
    true,
  );
  const historyRequest = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    sort: "+id",
  } satisfies IHrmTimeTrackingTimesheetSnapshot.IRequest;
  const history =
    await api.functional.hrmTimeTracking.owner.timesheets.snapshots.index(
      ownerConnection,
      {
        timesheetId: approved.id,
        body: historyRequest,
      },
    );
  typia.assert(history);
  TestValidator.equals("history page current", history.pagination.current, 1);
  TestValidator.equals("history page limit", history.pagination.limit, 10);
  TestValidator.predicate(
    "history records include created snapshots",
    history.pagination.records >= 2,
  );
  TestValidator.predicate(
    "history has at least two records",
    history.data.length >= 2,
  );
  TestValidator.predicate(
    "history contains pre-approval snapshot",
    ArrayUtil.has(
      history.data,
      (snapshot) => snapshot.id === preApprovalSnapshot.id,
    ),
  );
  TestValidator.predicate(
    "history contains post-approval snapshot",
    ArrayUtil.has(
      history.data,
      (snapshot) => snapshot.id === postApprovalSnapshot.id,
    ),
  );
  TestValidator.predicate(
    "history contains approved locked evidence",
    ArrayUtil.has(history.data, (snapshot) => snapshot.locked === true),
  );
  const historyAgain =
    await api.functional.hrmTimeTracking.owner.timesheets.snapshots.index(
      ownerConnection,
      {
        timesheetId: approved.id,
        body: historyRequest,
      },
    );
  typia.assert(historyAgain);
  TestValidator.equals(
    "history is deterministic across repeated reads",
    historyAgain,
    history,
  );
}
