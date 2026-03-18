import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_draft_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  const now = new Date();
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(0, 0, 0, 0);
  const created = await api.functional.hrmTimeTracking.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStart: monday.toISOString().slice(0, 10),
        weekEnd: sunday.toISOString().slice(0, 10),
      } satisfies IHrmTimeTrackingTimesheet.ICreate,
    },
  );
  typia.assert(created);
  const originalId = created.id;
  const originalEmployeeId = created.employee.id;
  const originalOrganizationId = created.organization.id;
  const originalStatus = created.status;
  const originalWeekStart = created.weekStart;
  const originalWeekEnd = created.weekEnd;
  const originalCreatedAt = created.createdAt;
  const updated = await api.functional.hrmTimeTracking.member.timesheets.update(
    memberConnection,
    {
      timesheetId: originalId,
      body: {
        week_start: monday.toISOString(),
        week_end: sunday.toISOString(),
      } satisfies IHrmTimeTrackingTimesheet.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "timesheet id should remain the same",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "employee ownership should remain the same",
    updated.employee.id,
    originalEmployeeId,
  );
  TestValidator.equals(
    "organization association should remain the same",
    updated.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "status should remain draft",
    updated.status,
    originalStatus,
  );
  TestValidator.equals(
    "week start should remain the same",
    updated.weekStart,
    originalWeekStart,
  );
  TestValidator.equals(
    "week end should remain the same",
    updated.weekEnd,
    originalWeekEnd,
  );
  TestValidator.equals(
    "submittedAt should remain null",
    updated.submittedAt,
    null,
  );
  TestValidator.equals(
    "reviewedAt should remain null",
    updated.reviewedAt,
    null,
  );
  TestValidator.equals(
    "reviewedByEmployee should remain null",
    updated.reviewedByEmployee,
    null,
  );
  TestValidator.equals(
    "rejectionReason should remain null",
    updated.rejectionReason,
    null,
  );
  TestValidator.notEquals(
    "update should return a fresh response object",
    updated,
    null,
  );
  TestValidator.equals(
    "created timestamp should remain unchanged",
    updated.createdAt,
    originalCreatedAt,
  );
}
