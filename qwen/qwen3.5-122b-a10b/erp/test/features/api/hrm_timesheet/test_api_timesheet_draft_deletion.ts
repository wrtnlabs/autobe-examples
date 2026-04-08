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

export async function test_api_timesheet_draft_deletion(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful deletion of a draft timesheet by its owner.
   *
   * Validates the draft timesheet deletion workflow including member authentication, timesheet creation, and soft-delete operation. Ensures that the deletion API accepts valid requests and completes without errors.
   *
   * Note: Full verification of soft-delete behavior (deleted_at timestamp, timelog preservation, list query exclusion) requires GET endpoints that are not available in the current SDK. This test focuses on the deletion operation itself.
   *
   * 1. Create and authenticate a member account.
   * 2. Create a draft timesheet for the member's organization.
   * 3. Call the delete endpoint with the draft timesheet ID.
   * 4. Verify the deletion completes successfully without errors.
   */
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a draft timesheet
  // Note: The generate function will create a timesheet with associated timelogs
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Set to Monday
  weekStartDate.setHours(0, 0, 0, 0);
  const organizationId =
    memberAuth.organizations?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timesheet);
  // 3. Verify timesheet is in draft status before deletion
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 4. Delete the draft timesheet
  await api.functional.hrm.member.organizations.timesheets.eraseByOrganizationidAndTimesheetid(
    memberConnection,
    {
      organizationId,
      timesheetId: timesheet.id,
    },
  );
  // 5. Verify deletion completed successfully (no error thrown)
  // Note: Full verification of soft-delete behavior requires GET endpoints not available in SDK
  TestValidator.predicate("deletion completed without error", true);
}
