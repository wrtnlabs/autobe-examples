import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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

/**
 * Test timesheet retrieval by owner (employee).
 *
 * Validates that an employee can successfully retrieve their own timesheet. The test authenticates as a member, creates a draft timesheet for a specific week period, then retrieves the timesheet by its unique identifier. Ensures that the response includes complete timesheet information: week period (weekStartDate and weekEndDate), status (draft), employee reference, and associated timelogs array. Confirms the employee can access their own timesheet regardless of status.
 *
 * 1. Member joins with email and password to obtain authentication token.
 * 2. Member creates a draft timesheet for a specific week (Monday start date).
 * 3. Member retrieves the created timesheet by its ID using the authenticated connection.
 * 4. Validates response structure includes all required fields: id, employee, weekStartDate, weekEndDate, status, timelogs.
 * 5. Confirms retrieved timesheet ID matches the created timesheet and status is draft.
 */
export async function test_api_timesheet_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create draft timesheet for current week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Retrieve timesheet by ID
  const retrieved = await api.functional.hrmPlatform.member.timesheets.at(
    memberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response structure and data integrity
  TestValidator.equals("timesheet ID matches", retrieved.id, timesheet.id);
  TestValidator.equals(
    "employee ID matches",
    retrieved.employee.id,
    timesheet.employee.id,
  );
  TestValidator.equals(
    "week start date matches",
    retrieved.weekStartDate,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "week end date matches",
    retrieved.weekEndDate,
    timesheet.weekEndDate,
  );
  TestValidator.equals("status is draft", retrieved.status, "draft");
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(retrieved.timelogs),
  );
}
