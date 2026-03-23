import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can filter their timesheets by specific approval status.
 *
 * This test verifies the timesheet filtering functionality by testing each
 * approval status (draft, submitted, approved, rejected) and validating that:
 * - Only timesheets matching the specified status are returned
 * - Status-specific fields are correctly populated (approved_at, rejected_at, etc.)
 * - The response structure is valid according to the DTO definitions
 */
export async function test_api_timesheet_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Test filtering by status "approved"
  const approvedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "approved",
      },
    });
  typia.assert(approvedTimesheets);
  // Validate all returned timesheets have approved status
  for (const timesheet of approvedTimesheets.data) {
    TestValidator.equals(
      "timesheet status is approved",
      timesheet.status,
      "approved",
    );
    TestValidator.predicate(
      "approved_at is populated",
      timesheet.approved_at !== null,
    );
    TestValidator.predicate(
      "approver is populated",
      timesheet.approver !== null,
    );
  }
  // 3. Test filtering by status "draft"
  const draftTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
      },
    });
  typia.assert(draftTimesheets);
  // Validate all returned timesheets have draft status
  for (const timesheet of draftTimesheets.data) {
    TestValidator.equals(
      "timesheet status is draft",
      timesheet.status,
      "draft",
    );
    TestValidator.equals(
      "submitted_at is null for draft",
      timesheet.submitted_at,
      null,
    );
    TestValidator.equals(
      "approved_at is null for draft",
      timesheet.approved_at,
      null,
    );
  }
  // 4. Test filtering by status "submitted"
  const submittedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "submitted",
      },
    });
  typia.assert(submittedTimesheets);
  // Validate all returned timesheets have submitted status
  for (const timesheet of submittedTimesheets.data) {
    TestValidator.equals(
      "timesheet status is submitted",
      timesheet.status,
      "submitted",
    );
    TestValidator.predicate(
      "submitted_at is populated",
      timesheet.submitted_at !== null,
    );
    TestValidator.equals(
      "approved_at is null for submitted",
      timesheet.approved_at,
      null,
    );
  }
  // 5. Test filtering by status "rejected"
  const rejectedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "rejected",
      },
    });
  typia.assert(rejectedTimesheets);
  // Validate all returned timesheets have rejected status
  for (const timesheet of rejectedTimesheets.data) {
    TestValidator.equals(
      "timesheet status is rejected",
      timesheet.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected_at is populated",
      timesheet.rejected_at !== null,
    );
    TestValidator.predicate(
      "rejection_reason is populated",
      timesheet.rejection_reason !== null,
    );
  }
}
