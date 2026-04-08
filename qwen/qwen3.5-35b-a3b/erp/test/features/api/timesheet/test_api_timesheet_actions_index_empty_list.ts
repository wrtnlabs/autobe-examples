import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_actions_index_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(authorized);
  // Update connection with authorization token for subsequent API calls
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create a draft timesheet without any actions
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        hrm_platform_employee_id: authorized.member.id,
      },
    },
  );
  typia.assert(timesheet);
  // 3. Query actions for the timesheet
  const actions =
    await api.functional.hrmPlatform.member.timesheets.actions.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {},
      },
    );
  typia.assert(actions);
  // 4. Validate empty action list with correct pagination metadata
  TestValidator.equals("empty action list", actions.data.length, 0);
  TestValidator.equals("records count", actions.pagination.records, 0);
  TestValidator.equals("pages count", actions.pagination.pages, 0);
}
