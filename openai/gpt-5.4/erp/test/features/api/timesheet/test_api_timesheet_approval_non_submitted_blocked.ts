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
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_approval_non_submitted_blocked(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeAuth);
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date("2026-03-03T00:00:00.000Z").toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "timesheet starts as draft",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "draft timesheet is not submitted",
    draftTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet is not reviewed",
    draftTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no rejection reason",
    draftTimesheet.rejection_reason,
    null,
  );
  const statusBefore = draftTimesheet.status;
  const submittedAtBefore = draftTimesheet.submitted_at;
  const reviewedAtBefore = draftTimesheet.reviewed_at;
  const rejectionReasonBefore = draftTimesheet.rejection_reason;
  const timelogIdsBefore = draftTimesheet.timelogs.map((timelog) => timelog.id);
  const totalHoursBefore = draftTimesheet.total_hours;
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(ownerAuth);
  await TestValidator.error(
    "owner approval is rejected for draft timesheet",
    async () => {
      await api.functional.hrmTimeTracking.owner.timesheets.approve(
        ownerConnection,
        {
          timesheetId: draftTimesheet.id,
        },
      );
    },
  );
  TestValidator.equals(
    "pre-approval status snapshot remains draft",
    statusBefore,
    "draft",
  );
  TestValidator.equals(
    "pre-approval submitted_at snapshot remains null",
    submittedAtBefore,
    null,
  );
  TestValidator.equals(
    "pre-approval reviewed_at snapshot remains null",
    reviewedAtBefore,
    null,
  );
  TestValidator.equals(
    "pre-approval rejection_reason snapshot remains null",
    rejectionReasonBefore,
    null,
  );
  TestValidator.equals(
    "pre-approval timelog ids snapshot is preserved",
    timelogIdsBefore,
    draftTimesheet.timelogs.map((timelog) => timelog.id),
  );
  TestValidator.equals(
    "pre-approval total_hours snapshot is preserved",
    totalHoursBefore,
    draftTimesheet.total_hours,
  );
}
