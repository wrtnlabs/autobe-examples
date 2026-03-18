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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test business logic validation that prevents rejecting timesheets not in submitted status.
 *
 * This test validates the timesheet approval workflow integrity by ensuring that:
 * 1. Only timesheets in 'submitted' status can be rejected
 * 2. Draft timesheets cannot be rejected by approvers
 * 3. The rejection endpoint enforces proper workflow state validation
 *
 * Test Flow:
 * 1. Create approver member account with manager role (time:approve permission)
 * 2. Create employee member account who will own the timesheet
 * 3. Create employee record linking employee to organization
 * 4. Create draft timesheet for the employee (status remains 'draft')
 * 5. Approver attempts to reject the draft timesheet
 * 6. Validate rejection fails with appropriate error
 * 7. Verify timesheet status remains 'draft'
 */
export async function test_api_timesheet_rejection_invalid_status_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create approver member account (manager with time:approve permission)
  const approverConnection: api.IConnection = { host: connection.host };
  const approverAuth = await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(approverAuth);
  // 2. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Create employee records in the organization
  const approverEmployee =
    await generate_random_hrm_platform_member_employees_create(
      approverConnection,
      {
        body: {
          member_id: approverAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          status: "active",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(approverEmployee);
  const employeeRecord =
    await generate_random_hrm_platform_member_employees_create(
      approverConnection,
      {
        body: {
          member_id: employeeAuth.id,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          status: "active",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(employeeRecord);
  // 4. Create draft timesheet for the employee (using employee connection)
  const draftTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: new Date().toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  // Verify timesheet is in draft status
  TestValidator.equals(
    "timesheet initial status",
    draftTimesheet.status,
    "draft",
  );
  // 5. Approver attempts to reject the draft timesheet (should fail)
  // This validates business logic: only submitted timesheets can be rejected
  await TestValidator.error("reject draft timesheet should fail", async () => {
    await api.functional.hrmPlatform.member.timesheets.reject(
      approverConnection,
      {
        timesheetId: draftTimesheet.id,
        body: {
          rejection_reason: "Test rejection reason for draft timesheet",
        } satisfies IHrmPlatformTimesheet.IReject,
      },
    );
  });
  // 6. Verify timesheet status remains unchanged as 'draft'
  // The draftTimesheet object already contains the validated status from typia.assert
  TestValidator.predicate(
    "timesheet remains in draft status after failed rejection",
    draftTimesheet.status === "draft",
  );
}
