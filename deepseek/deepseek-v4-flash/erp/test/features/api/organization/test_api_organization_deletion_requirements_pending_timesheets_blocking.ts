import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

/**
 * Test that draft timesheets are correctly identified as blocking conditions for organization deletion.
 *
 * Validates that the deletion-requirements endpoint accurately reports unresolved draft timesheets. An organization can only be deleted when all pending timesheets are resolved (approved or rejected) and no active contracts exist.
 *
 * 1. Register a new member via the join endpoint — the member becomes the organization owner.
 * 2. Create a new organization — the authenticated member is assigned as the owner with full control.
 * 3. Create a project within the organization — required to associate timesheets.
 * 4. Create a draft timesheet for the current work week — a draft timesheet is an unresolved/pending timesheet that blocks deletion.
 * 5. Call the deletion-requirements endpoint as the organization owner.
 * 6. Assert that pendingTimesheetsResolved is false, pendingTimesheetCount ≥ 1, allRequirementsMet is false, and noActiveContracts is true.
 */
export async function test_api_organization_deletion_requirements_pending_timesheets_blocking(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection via member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create an organization — the authenticated member becomes the owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Create a project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Compute the Monday of the current week for the timesheet week start
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const weekStart: string = monday.toISOString().split("T")[0];
  // Create a draft timesheet for the current week — unresolved/pending state
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStart,
        },
      },
    );
  typia.assert(timesheet);
  // Check deletion requirements — the draft timesheet should block deletion
  const requirement =
    await api.functional.hrmTimeTracking.member.organizations.deletion_requirements.at(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(requirement);
  // Assert that pending timesheets block deletion
  TestValidator.equals(
    "pendingTimesheetsResolved",
    requirement.pendingTimesheetsResolved,
    false,
  );
  TestValidator.predicate(
    "pendingTimesheetCount >= 1",
    requirement.pendingTimesheetCount >= 1,
  );
  TestValidator.equals(
    "allRequirementsMet",
    requirement.allRequirementsMet,
    false,
  );
  TestValidator.equals(
    "noActiveContracts",
    requirement.noActiveContracts,
    true,
  );
}
