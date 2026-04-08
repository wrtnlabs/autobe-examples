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
 * Test timesheet retrieval workflow for approval review.
 *
 * Validates the complete timesheet submission and retrieval flow including member authentication, timesheet creation, submission, and retrieval. Ensures that submitted timesheets can be accessed and contain all required information for approval review.
 *
 * Special attention is given to verifying that the timesheet status transitions correctly from draft to submitted, and that the retrieval response includes all timesheet details including week period, employee information, and associated timelog entries.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates a draft timesheet for a specific week period.
 * 3. Member submits the timesheet to change status from draft to submitted.
 * 4. Member retrieves the submitted timesheet by ID.
 * 5. Validates timesheet status is 'submitted' and includes all required fields.
 */
export async function test_api_timesheet_retrieval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create draft timesheet
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  TestValidator.equals("initial status", timesheet.status, "draft");
  // 3. Submit timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is set",
    submittedTimesheet.submittedAt !== null &&
      submittedTimesheet.submittedAt !== undefined,
  );
  // 4. Retrieve submitted timesheet
  const retrievedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.at(memberConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 5. Validate retrieved timesheet
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    submittedTimesheet.id,
  );
  TestValidator.equals(
    "status is submitted",
    retrievedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "has employee info",
    retrievedTimesheet.employee !== undefined,
  );
  TestValidator.predicate(
    "has week start date",
    retrievedTimesheet.weekStartDate !== undefined,
  );
  TestValidator.predicate(
    "has week end date",
    retrievedTimesheet.weekEndDate !== undefined,
  );
  TestValidator.predicate(
    "has timelogs array",
    Array.isArray(retrievedTimesheet.timelogs),
  );
  TestValidator.equals(
    "employee member ID matches",
    retrievedTimesheet.employee.member.id,
    memberAuth.id,
  );
}
