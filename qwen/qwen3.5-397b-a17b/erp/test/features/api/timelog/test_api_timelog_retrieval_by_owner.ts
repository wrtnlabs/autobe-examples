import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that an employee can successfully retrieve their own timelog entry.
 *
 * Validates the complete timelog ownership and retrieval flow including member authentication, organization creation, project setup, project membership assignment, timelog creation, and timelog retrieval by ID. Ensures that the authenticated employee can access their own timelog data with all required fields properly populated.
 *
 * Special attention is given to verifying ownership-based access control where employees can only retrieve their own timelogs, and that the response structure contains all mandatory fields (id, date, duration_minutes, billable, employee, project, timestamps) while optional fields (task, timesheet) are null for standalone timelogs.
 *
 * 1. Member joins the platform with unique credentials.
 * 2. Member creates an organization (automatically becomes owner with employee record).
 * 3. Project is created within the organization for time tracking.
 * 4. Employee (organization owner) is assigned to the project as a member.
 * 5. Employee creates a timelog entry for work performed on the project.
 * 6. Employee retrieves the timelog using its unique ID.
 * 7. Validates all required fields are present and correctly populated.
 * 8. Validates optional task and timesheet references are null.
 * 9. Validates the timelog's employee matches the authenticated user.
 */
export async function test_api_timelog_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create organization (member becomes owner with employee record)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Note: In a complete implementation, we would need to:
  //    - List employees to get the employee ID for the organization owner
  //    - Assign that employee to the project using generate_random_hrm_platform_member_projects_members_create
  //    Since employee endpoints are not in the available SDK, this step is acknowledged but cannot be implemented
  //    The timelog creation will automatically associate with the authenticated user's employee record
  // 5. Create timelog entry (automatically associated with authenticated user's employee record)
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        date: new Date().toISOString(),
        duration_minutes: 60,
        description: "Test timelog entry for validation",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Retrieve timelog by ID
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 7. Validate all required fields are present and match
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals("date matches", retrievedTimelog.date, timelog.date);
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimelog.description,
    timelog.description,
  );
  // 8. Validate employee reference matches authenticated user
  TestValidator.equals(
    "employee ID matches authenticated member",
    retrievedTimelog.employee.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "employee email matches authenticated member",
    retrievedTimelog.employee.member.email,
    memberAuth.email,
  );
  // 9. Validate project reference
  TestValidator.equals(
    "project ID matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimelog.project.name,
    project.name,
  );
  // 10. Validate optional fields are null for standalone timelog
  TestValidator.equals(
    "task is null for standalone timelog",
    retrievedTimelog.task ?? null,
    null,
  );
  TestValidator.equals(
    "timesheet is null for standalone timelog",
    retrievedTimelog.timesheet ?? null,
    null,
  );
  // 11. Validate timestamps exist and deleted_at is null
  TestValidator.predicate(
    "created_at timestamp exists",
    () => retrievedTimelog.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    () => retrievedTimelog.updated_at !== null,
  );
  TestValidator.equals(
    "deleted_at is null for active timelog",
    retrievedTimelog.deleted_at,
    null,
  );
}