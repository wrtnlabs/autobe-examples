import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";

/**
 * Test timelog update task validation for cross-project task reference.
 *
 * Validates that updating a timelog to reference a task properly enforces the constraint that the task must belong to the same project as the timelog. This test ensures foreign key constraint enforcement during timelog updates prevents invalid cross-project task assignments.
 *
 * The test creates two separate projects with their own tasks, establishes a timelog on the first project, then attempts to update it to reference a task from the second project. The update operation must be rejected with an appropriate error to maintain data integrity.
 *
 * 1. Authenticate member user for HRM system access.
 * 2. Create first project for original timelog association.
 * 3. Create second project for invalid task reference.
 * 4. Assign employee to first project for timelog creation.
 * 5. Create task in first project (valid target).
 * 6. Create task in second project (invalid target for update).
 * 7. Create initial timelog on first project with valid project association.
 * 8. Attempt to update timelog to reference task from second project.
 * 9. Validate the update operation is rejected due to cross-project constraint.
 */
export async function test_api_timelog_update_task_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Generate organization ID (will be used for all operations)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create first project for original timelog
  const firstProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(firstProject);
  // 3. Create second project for invalid task reference
  const secondProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(secondProject);
  // 4. Assign employee to first project
  // Note: We need to get the employee ID from the authenticated member
  // The member auth response should contain organization information
  // For this test, we'll use the member's employee context
  const employeeId = memberAuth.token.access; // This is a placeholder - actual implementation would extract employee_id from JWT
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: firstProject.id },
      body: {
        employee_id: typia.random<string & tags.Format<"uuid">>(),
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 5. Create task in first project
  const firstTask =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: firstProject.id,
        },
      },
    );
  typia.assert(firstTask);
  // 6. Create task in second project
  const secondTask =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: secondProject.id,
        },
      },
    );
  typia.assert(secondTask);
  // 7. Create initial timelog on first project
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: firstProject.id,
          hrm_task_id: firstTask.id,
          date: new Date().toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  // 8. Attempt to update timelog to reference task from second project
  // This should fail because secondTask belongs to secondProject, not firstProject
  await TestValidator.error(
    "cross-project task reference should be rejected",
    async () => {
      await api.functional.hrm.member.organizations.timelogs.update(
        memberConnection,
        {
          organizationId,
          timelogId: timelog.id,
          body: {
            hrm_task_id: secondTask.id,
          } satisfies IHrmTimelog.IUpdate,
        },
      );
    },
  );
  // 9. Validate that the timelog still references the original task
  const updatedTimelog =
    await api.functional.hrm.member.organizations.timelogs.update(
      memberConnection,
      {
        organizationId,
        timelogId: timelog.id,
        body: {},
      },
    );
  typia.assert(updatedTimelog);
  TestValidator.equals(
    "task remains unchanged",
    updatedTimelog.task?.id,
    firstTask.id,
  );
}
