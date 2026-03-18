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

export async function test_api_timesheet_organization_scope_and_state_protection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().substring(0, 10);
  const weekEndDate = new Date(monday);
  weekEndDate.setDate(monday.getDate() + 6);
  const weekEnd = weekEndDate.toISOString().substring(0, 10);
  const created = await api.functional.hrmTimeTracking.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStart,
        weekEnd,
      } satisfies IHrmTimeTrackingTimesheet.ICreate,
    },
  );
  typia.assert(created);
  const updated = await api.functional.hrmTimeTracking.member.timesheets.update(
    memberConnection,
    {
      timesheetId: created.id,
      body: {
        status: "submitted",
        submitted_at: new Date().toISOString(),
      } satisfies IHrmTimeTrackingTimesheet.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "timesheet identity should remain stable after workflow update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "organization binding should remain stable after workflow update",
    updated.organization.id,
    created.organization.id,
  );
  TestValidator.equals(
    "employee ownership should remain stable after workflow update",
    updated.employee.id,
    created.employee.id,
  );
  TestValidator.equals(
    "submitted workflow should be reflected in status",
    updated.status,
    "submitted",
  );
}
