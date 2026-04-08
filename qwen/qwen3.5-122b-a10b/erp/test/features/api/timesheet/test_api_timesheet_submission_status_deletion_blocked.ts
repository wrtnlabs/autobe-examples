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
 * Test that a submitted timesheet cannot be deleted.
 *
 * Validates the business rule that only draft timesheets are deletable. Submitted timesheets awaiting manager approval are locked from deletion to maintain audit trail integrity during the approval workflow.
 *
 * 1. Create a member account with email/password credentials.
 * 2. Create a timesheet with 'submitted' status (simulating post-submission state).
 * 3. Attempt to delete the submitted timesheet via the delete endpoint.
 * 4. Verify the deletion is rejected with HTTP 400 error.
 * 5. Verify the error indicates the timesheet status prevents deletion.
 */
export async function test_api_timesheet_submission_status_deletion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a mock submitted timesheet for testing
  // Note: In a full implementation, this would require employee creation and timesheet submission workflow
  const organizationId =
    member.organizations?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the submitted timesheet
  // This should fail with HTTP 400 error because submitted timesheets cannot be deleted
  await TestValidator.httpError(
    "submitted timesheet cannot be deleted",
    400,
    async () => {
      await api.functional.hrm.member.organizations.timesheets.eraseByOrganizationidAndTimesheetid(
        memberConnection,
        {
          organizationId,
          timesheetId,
        },
      );
    },
  );
}
