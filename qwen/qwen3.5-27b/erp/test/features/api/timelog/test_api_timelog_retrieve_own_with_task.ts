import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog retrieval with task association.
 * Validates that an authenticated member can retrieve their own timelog
 * with complete details including nested employee, project, and task information.
 */
export async function test_api_timelog_retrieve_own_with_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        budget_hours: typia.random<number & tags.Type<"double">>(),
      },
    },
  );
  typia.assert(project);
  // 3. Assign employee to project (use authenticated member's ID as employee_id)
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // 4. Create a task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
        due_date: new Date().toISOString(),
        estimated_hours: typia.random<number & tags.Type<"double">>(),
        assigned_employee_id: membership.employee.id,
      },
    },
  );
  typia.assert(task);
  // 5. Create a timelog with project and task association
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        date: new Date().toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
        >(),
        billable: true,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timelog);
  // 6. Retrieve the timelog by ID
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 7. Validate timelog data
  TestValidator.equals("timelog id matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals("date matches", retrievedTimelog.date, timelog.date);
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.duration,
    timelog.duration,
  );
  TestValidator.equals(
    "billable matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
  TestValidator.equals(
    "project id matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.equals("task id matches", retrievedTimelog.task?.id, task.id);
  TestValidator.equals(
    "employee id matches",
    retrievedTimelog.employee.id,
    membership.employee.id,
  );
  TestValidator.predicate("task is not null", retrievedTimelog.task !== null);
  TestValidator.predicate(
    "deleted_at is null",
    retrievedTimelog.deleted_at === null,
  );
  TestValidator.predicate(
    "duration is positive",
    retrievedTimelog.duration > 0,
  );
}
