import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_rejection_revision_and_resubmission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: adminHref,
      referrer: adminReferrer,
    },
  });
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IErpHrmAdmin.ILogin,
  });
  const adminSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminSessionConnection,
    {},
  );
  // 3. Member joins and logs in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: memberHref,
      referrer: memberReferrer,
    },
  });
  const memberAuth = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies IErpHrmMember.ILogin,
  });
  const memberSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 4. Set organization context for member
  await generate_random_erp_hrm_member_organization_context_select(
    memberSessionConnection,
    {
      body: { organizationId: organization.id },
    },
  );
  // 5. Admin creates a project
  const project = typia.assert(
    await generate_random_erp_hrm_admin_projects_create(
      adminSessionConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#4A90E2",
          status: "active",
        } satisfies IErpHrmProject.ICreate,
      },
    ),
  );
  // 6. Create timelogs for the member (Monday to Wednesday of a week)
  const monday = new Date("2026-03-30");
  const timelogs: IErpHrmTimelog[] = [];
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const timelogDate = new Date(monday);
    timelogDate.setDate(monday.getDate() + dayOffset);
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberSessionConnection,
      {
        body: {
          projectId: project.items[0].projectId,
          date: timelogDate.toISOString(),
          durationMinutes: 480,
          description: `Work day ${dayOffset + 1}`,
          billable: true,
        } satisfies IErpHrmTimelog.ICreate,
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // 7. Create draft timesheet for the week
  const draftTimesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberSessionConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(draftTimesheet);
  // Validate draft status
  TestValidator.equals(
    "initial status is draft",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "has 3 timelogs",
    draftTimesheet.timesheetTimelogs.length,
    3,
  );
  // 8. Submit the timesheet (first submission)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.update(
      memberSessionConnection,
      {
        timesheetId: draftTimesheet.id,
        body: {
          status: "submitted",
        } satisfies IErpHrmTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // Validate submitted status
  TestValidator.equals(
    "status is submitted after first submission",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is set",
    submittedTimesheet.submittedAt !== null,
  );
  const firstSubmittedAt = submittedTimesheet.submittedAt;
  // 9. Admin rejects the timesheet
  const rejectionReason =
    "Missing project details for some entries. Please add descriptions.";
  const rejectedTimesheet = await api.functional.erpHrm.admin.timesheets.reject(
    adminSessionConnection,
    {
      timesheetId: submittedTimesheet.id,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    },
  );
  typia.assert(rejectedTimesheet);
  // 10. Verify timesheet returns to draft status with rejection_reason visible
  TestValidator.equals(
    "status is draft after rejection",
    rejectedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "rejection reason is visible",
    rejectedTimesheet.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedAt is set after rejection",
    rejectedTimesheet.reviewedAt !== null,
  );
  TestValidator.predicate(
    "submittedAt is null after rejection",
    rejectedTimesheet.submittedAt === null,
  );
  // 11. Add another timelog to fix the timesheet (simulating employee revision)
  const thursdayDate = new Date(monday);
  thursdayDate.setDate(monday.getDate() + 3);
  const additionalTimelog =
    await generate_random_erp_hrm_member_timelogs_create(
      memberSessionConnection,
      {
        body: {
          projectId: project.items[0].projectId,
          date: thursdayDate.toISOString(),
          durationMinutes: 360,
          description: "Additional work - project research",
          billable: true,
        } satisfies IErpHrmTimelog.ICreate,
      },
    );
  typia.assert(additionalTimelog);
  // 12. Resubmit the corrected timesheet
  const resubmittedTimesheet =
    await api.functional.erpHrm.member.timesheets.update(
      memberSessionConnection,
      {
        timesheetId: rejectedTimesheet.id,
        body: {
          status: "submitted",
        } satisfies IErpHrmTimesheet.IUpdate,
      },
    );
  typia.assert(resubmittedTimesheet);
  // 13. Validate resubmission
  TestValidator.equals(
    "status is submitted after resubmission",
    resubmittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is updated after resubmission",
    resubmittedTimesheet.submittedAt !== null,
  );
  TestValidator.equals(
    "rejection reason is cleared after resubmission",
    resubmittedTimesheet.rejectionReason,
    null,
  );
  // Verify the submitted_at timestamp is updated (new submission)
  if (resubmittedTimesheet.submittedAt && firstSubmittedAt) {
    const resubmitDate = new Date(resubmittedTimesheet.submittedAt);
    const firstSubmitDate = new Date(firstSubmittedAt);
    TestValidator.predicate(
      "new submittedAt is after original submittedAt",
      resubmitDate > firstSubmitDate,
    );
  }
}
