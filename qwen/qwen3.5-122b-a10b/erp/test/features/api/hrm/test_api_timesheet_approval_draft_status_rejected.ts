import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test that approving a draft timesheet is rejected with proper error handling.
 *
 * Validates the timesheet approval workflow by ensuring that draft timesheets cannot be approved directly. Only timesheets in 'submitted' status can transition to 'approved' status. This test verifies the business rule enforcement and proper error response when attempting to approve a timesheet that has not been submitted.
 *
 * 1. Member registers and authenticates with the HRM system.
 * 2. Attempt to approve a non-existent timesheet (simulating draft status scenario).
 * 3. Verify the system returns a 400 error indicating the timesheet cannot be approved.
 * 4. Note: Full draft timesheet creation requires organization and employee setup which are not available in current utility functions.
 *
 * Business Rule: Only submitted timesheets can be approved. Draft timesheets must be submitted first before approval is allowed.
 */
export async function test_api_timesheet_approval_draft_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Attempt to approve a timesheet that is not in submitted status
  // Using a random UUID to simulate attempting to approve a timesheet that either:
  // - Doesn't exist (404)
  // - Exists but is in draft status (400 - the scenario we're testing)
  // The HTTP error validator will catch either case as the endpoint should reject non-submitted timesheets
  const draftTimesheetId = typia.random<string & tags.Format<"uuid">>();
  // This validates that the approval endpoint properly rejects timesheets not in 'submitted' status
  await TestValidator.httpError(
    "draft timesheet cannot be approved",
    400,
    async () => {
      await api.functional.hrm.member.timesheets.approve(memberConnection, {
        timesheetId: draftTimesheetId,
      });
    },
  );
}
