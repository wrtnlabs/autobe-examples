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

export async function test_api_timesheet_approve_submitted_record(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const today = new Date();
  const dayOfWeek = (today.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - dayOfWeek);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().substring(0, 10);
  const draft = await api.functional.hrmTimeTracking.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStart,
      } satisfies IHrmTimeTrackingTimesheet.ICreate,
    },
  );
  typia.assert(draft);
  await TestValidator.error(
    "approving a draft timesheet before submission should fail",
    async () => {
      await api.functional.hrmTimeTracking.member.timesheets.approve(
        memberConnection,
        { timesheetId: draft.id },
      );
    },
  );
  const submitted =
    await api.functional.hrmTimeTracking.member.timesheets.submit.process(
      memberConnection,
      { timesheetId: draft.id },
    );
  typia.assert(submitted);
  const approved =
    await api.functional.hrmTimeTracking.member.timesheets.approve(
      memberConnection,
      { timesheetId: draft.id },
    );
  typia.assert(approved);
  TestValidator.equals(
    "approved timesheet id should match",
    approved.id,
    draft.id,
  );
  TestValidator.equals(
    "organization context should match",
    approved.organization.id,
    draft.organization.id,
  );
  TestValidator.equals(
    "employee should match",
    approved.employee.id,
    draft.employee.id,
  );
  TestValidator.equals(
    "status should be approved",
    approved.status,
    "approved",
  );
  TestValidator.predicate(
    "submittedAt should exist after approval",
    approved.submittedAt !== null,
  );
  TestValidator.predicate(
    "reviewedAt should exist after approval",
    approved.reviewedAt !== null,
  );
  TestValidator.predicate(
    "reviewedByEmployee should be populated when reviewer metadata is returned",
    approved.reviewedByEmployee === null ||
      approved.reviewedByEmployee.id !== "",
  );
}
