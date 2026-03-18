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

export async function test_api_timesheet_create_with_week_normalization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const sourceDate = new Date();
  sourceDate.setUTCHours(12, 0, 0, 0);
  const weekday = sourceDate.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(sourceDate);
  monday.setUTCDate(sourceDate.getUTCDate() + mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);
  const wednesday = new Date(monday);
  wednesday.setUTCDate(monday.getUTCDate() + 2);
  const expectedWeekStart = monday.toISOString();
  const expectedWeekEndDate = new Date(monday);
  expectedWeekEndDate.setUTCDate(monday.getUTCDate() + 6);
  expectedWeekEndDate.setUTCHours(23, 59, 59, 999);
  const expectedWeekEnd = expectedWeekEndDate.toISOString();
  const created = await api.functional.hrmTimeTracking.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStart: wednesday.toISOString().slice(0, 10),
      } satisfies IHrmTimeTrackingTimesheet.ICreate,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "timesheet should be created in draft status",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet weekStart should normalize to the Monday of the requested week",
    new Date(created.weekStart).toISOString(),
    expectedWeekStart,
  );
  TestValidator.equals(
    "timesheet weekEnd should normalize to the Sunday of the requested week",
    new Date(created.weekEnd).toISOString(),
    expectedWeekEnd,
  );
  TestValidator.equals(
    "timesheet should not be submitted on creation",
    created.submittedAt,
    null,
  );
  TestValidator.equals(
    "timesheet should not be reviewed on creation",
    created.reviewedAt,
    null,
  );
  TestValidator.equals(
    "timesheet should not have a reviewer on creation",
    created.reviewedByEmployee,
    null,
  );
  TestValidator.equals(
    "timesheet should not have a rejection reason on creation",
    created.rejectionReason,
    null,
  );
  TestValidator.equals(
    "timesheet should not be soft deleted on creation",
    created.deletedAt,
    null,
  );
  TestValidator.equals(
    "timesheet organization should be present",
    created.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "timesheet employee should be present",
    created.employee.id,
    created.employee.id,
  );
}
