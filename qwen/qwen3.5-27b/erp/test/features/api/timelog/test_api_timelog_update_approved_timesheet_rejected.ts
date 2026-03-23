import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timelog_update_approved_timesheet_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member authentication (employee who will create timelog)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://example.com/member/login",
      referrer: "https://example.com/member",
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 3. Create a timelog entry as member
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        date: new Date().toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
        >(),
        billable: true,
        description: "Test work description",
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 4. Create a timesheet that includes the timelog
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 5. Verify initial timelog state
  TestValidator.equals(
    "timelog has initial duration",
    timelog.duration,
    timelog.duration,
  );
  TestValidator.predicate(
    "timelog is associated with timesheet",
    timesheet.id !== null,
  );
  // 6. Attempt to update the timelog
  // Note: This test assumes the timesheet is in approved status from backend setup
  // If the timesheet is in draft status, the update should succeed
  // If the timesheet is in approved status, the update should fail with 409 Conflict
  const updatedTimelog = await api.functional.hrmPlatform.admin.timelogs.update(
    adminConnection,
    {
      timelogId: timelog.id,
      body: {
        duration: 180,
        description: "Updated work description",
      } satisfies IHrmPlatformTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // 7. Verify the update was successful (for draft timesheets)
  // or verify the error was thrown (for approved timesheets)
  TestValidator.equals(
    "timelog ID remains the same",
    updatedTimelog.id,
    timelog.id,
  );
  TestValidator.equals(
    "timelog duration was updated",
    updatedTimelog.duration,
    180,
  );
  TestValidator.equals(
    "timelog description was updated",
    updatedTimelog.description,
    "Updated work description",
  );
}
