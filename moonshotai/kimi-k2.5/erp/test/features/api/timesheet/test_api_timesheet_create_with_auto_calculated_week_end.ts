import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_create_with_auto_calculated_week_end(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to obtain JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies Partial<IErpHrmMember.IJoin>,
  });
  typia.assert(authorizedMember);
  // Step 2: Create timesheet providing only week_start_date
  const weekStartDate = new Date();
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate.toISOString(),
        // weekEndDate intentionally omitted to test auto-calculation
      } satisfies Partial<IErpHrmTimesheet.ICreate>,
    },
  );
  typia.assert(timesheet);
  // Step 3: Validate auto-calculated week_end_date (6 days after start)
  const expectedEndDate = new Date(weekStartDate);
  expectedEndDate.setDate(expectedEndDate.getDate() + 6);
  TestValidator.equals(
    "weekStartDate matches input",
    timesheet.weekStartDate,
    weekStartDate.toISOString(),
  );
  TestValidator.equals(
    "weekEndDate is auto-calculated as 6 days after start",
    timesheet.weekEndDate,
    expectedEndDate.toISOString(),
  );
  // Step 4: Verify status is 'draft'
  TestValidator.equals("status is draft", timesheet.status, "draft");
  // Step 5: Verify review fields are null
  TestValidator.equals("submittedAt is null", timesheet.submittedAt, null);
  TestValidator.equals("reviewedAt is null", timesheet.reviewedAt, null);
  TestValidator.equals(
    "rejectionReason is null",
    timesheet.rejectionReason,
    null,
  );
  // Step 6: Verify UUID generation for timesheet id
  typia.assert(timesheet.id);
  // Step 7: Verify timesheet belongs to authenticated member
  TestValidator.predicate(
    "organizationMember exists",
    () =>
      timesheet.organizationMember !== null &&
      timesheet.organizationMember.user !== null,
  );
  TestValidator.equals(
    "timesheet belongs to authenticated member",
    timesheet.organizationMember.user.id,
    authorizedMember.id,
  );
}
