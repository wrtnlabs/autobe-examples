import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_admin_timelogs_create } from "../../../generate/generate_random_hrm_platform_admin_timelogs_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that an authenticated admin can retrieve a specific timelog by ID
 * and receive complete details including nested employee, project, and
 * optional task information.
 */
export async function test_api_timelog_retrieve_by_admin_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  // 2. Create project for timelog
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create task within the project
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      body: {
        title: "Test Task for Timelog",
        description: "Task created for timelog testing",
        status: "open",
        priority: "medium",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 4. Create timelog with project and task assignment
  const timelog = await generate_random_hrm_platform_admin_timelogs_create(
    adminConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        date: new Date().toISOString(),
        duration: 480, // 8 hours in minutes
        billable: true,
        description: "Worked on test task",
      },
    },
  );
  typia.assert(timelog);
  // 5. Retrieve timelog by ID as admin
  const retrievedTimelog = await api.functional.hrmPlatform.admin.timelogs.at(
    adminConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 6. Validate timelog fields match creation data
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "timelog date matches",
    retrievedTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "timelog duration matches",
    retrievedTimelog.duration,
    timelog.duration,
  );
  TestValidator.equals(
    "timelog billable matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "timelog description matches",
    retrievedTimelog.description,
    timelog.description,
  );
  // 7. Validate nested employee object contains required information
  TestValidator.equals(
    "employee employment_type exists",
    typeof retrievedTimelog.employee.employment_type,
    "string",
  );
  TestValidator.equals(
    "employee status exists",
    typeof retrievedTimelog.employee.status,
    "string",
  );
  TestValidator.predicate(
    "employee member exists",
    retrievedTimelog.employee.member !== null,
  );
  TestValidator.equals(
    "employee member has email",
    typeof retrievedTimelog.employee.member.email,
    "string",
  );
  // 8. Validate nested project object contains required information
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
  TestValidator.equals(
    "project status matches",
    retrievedTimelog.project.status,
    project.status,
  );
  TestValidator.equals(
    "project color_code matches",
    retrievedTimelog.project.color_code,
    project.color_code,
  );
  // 9. Validate nested task object (should exist since we assigned task)
  TestValidator.predicate("task object exists", retrievedTimelog.task !== null);
  typia.assertGuard<IHrmPlatformTask>(retrievedTimelog.task!);
  TestValidator.equals("task ID matches", retrievedTimelog.task.id, task.id);
  TestValidator.equals(
    "task title matches",
    retrievedTimelog.task.title,
    task.title,
  );
  TestValidator.equals(
    "task belongs to same project",
    retrievedTimelog.task.project.id,
    project.id,
  );
  // 10. Validate timelog is active (not deleted)
  TestValidator.equals(
    "timelog is not deleted",
    retrievedTimelog.deleted_at,
    null,
  );
}