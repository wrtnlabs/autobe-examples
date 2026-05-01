import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Verify that the owner of a timelog can retrieve its full details including all related entity summaries.
 *
 * Validates the complete timelog retrieval flow where an authenticated member creates a timelog against an active project and then fetches it by ID. The test confirms that the response contains all required fields with correct values and that related entity summaries are properly populated.
 *
 * Special attention is given to verifying that the timelog's project reference is correct and in active status, and that optional relations (task, timesheet) are null for freshly created ungrouped timelogs. The soft-delete marker is also confirmed null for an active record.
 *
 * 1. Member registers and authenticates via join.
 * 2. Member creates an active project for time tracking.
 * 3. Member assigns themselves to the project as a project member.
 * 4. Member creates a timelog entry against the project.
 * 5. Member retrieves the timelog by ID and validates all business-relevant fields.
 */
export async function test_api_timelog_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign member to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      { params: { projectId: project.id } },
    );
  typia.assert(projectMember);
  // 4. Create timelog against the project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project.id } },
  );
  typia.assert(timelog);
  // 5. Retrieve timelog by ID
  const retrieved = await api.functional.erpHrm.member.timelogs.at(
    memberConnection,
    { timelogId: timelog.id },
  );
  typia.assert(retrieved);
  // 6. Validate business-relevant fields
  TestValidator.equals("timelog id matches", retrieved.id, timelog.id);
  TestValidator.equals("date matches", retrieved.date, timelog.date);
  TestValidator.equals(
    "duration_minutes matches",
    retrieved.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description matches",
    retrieved.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable matches",
    retrieved.billable,
    timelog.billable,
  );
  TestValidator.equals("project id matches", retrieved.project.id, project.id);
  TestValidator.equals("project is active", retrieved.project.status, "active");
  TestValidator.equals("task is null when not assigned", retrieved.task, null);
  TestValidator.equals(
    "timesheet is null when ungrouped",
    retrieved.timesheet,
    null,
  );
  TestValidator.predicate(
    "deleted_at is null for active timelog",
    retrieved.deleted_at === null,
  );
}
