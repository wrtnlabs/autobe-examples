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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Retrieve rejected timesheet for employee resubmission review.
 *
 * An employee retrieves their rejected timesheet to review rejection feedback, examine review metadata, and prepare timelog modifications for resubmission. The retrieval endpoint returns complete timesheet details including all review-related fields and associated timelog entries.
 *
 * Validates that rejected timesheets contain proper review metadata including rejection reason, reviewer identity, and review timestamp. Confirms timelogs remain accessible for inspection and modification before resubmission.
 *
 * 1. Authenticate employee to the HRM platform.
 * 2. Create a project with timelog entries for time tracking context.
 * 3. Generate a timesheet that enters rejection review workflow.
 * 4. Retrieve timesheet detail and validate rejection reason, reviewer record, reviewed_at timestamp, and accessible timelogs for resubmission preparation.
 */
export async function test_api_timesheet_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate employee
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project for timelog entries
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a timelog for the timesheet context
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: { projectId: project.id },
    },
  );
  typia.assert(timelog);
  // 4. Create a timesheet
  const weekStart = "2025-01-06T00:00:00.000Z";
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: weekStart },
    },
  );
  typia.assert(timesheet);
  // 5. Retrieve the timesheet details and validate complete structure
  const retrieved = await api.functional.hrmPlatform.member.timesheets.at(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(retrieved);
  // 6. Validate business logic: rejection metadata and timelogs accessible
  TestValidator.equals("timesheet id matches", retrieved.id, timesheet.id);
  TestValidator.equals(
    "week start date matches",
    retrieved.week_start_date,
    weekStart,
  );
  TestValidator.predicate(
    "rejection reason present, reviewer populated, reviewed_at set",
    () =>
      typeof retrieved.rejection_reason === "string" &&
      retrieved.rejection_reason !== "" &&
      retrieved.reviewer !== null &&
      retrieved.reviewed_at !== null,
  );
  TestValidator.predicate("timelogs accessible for resubmission", () =>
    Array.isArray(retrieved.timelogs),
  );
}
