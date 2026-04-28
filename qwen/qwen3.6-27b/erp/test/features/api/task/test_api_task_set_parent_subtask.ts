import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task parent-child relationship through subtask nesting.
 *
 * Validates the ability to establish parent-child task relationships within
 * a project, enforcing one-level subtask nesting. Verifies that a task can be
 * created as a root-level task, updated with a parent reference to become a
 * subtask, and that the relationship is correctly reflected in the response.
 *
 * Key validations include confirming the parent task reference is established
 * after update and that the updated_at timestamp reflects the modification.
 * Ensures that subtask nesting respects the one-level constraint by setting
 * a previously root-level task to have a valid parent.
 *
 * 1. Member authenticates via join.
 * 2. Project is created for the organization.
 * 3. Parent (root-level) task is created without parent_id.
 * 4. Child task is created as a root-level task initially.
 * 5. Child task is updated with parent_id set to the parent task's ID.
 * 6. Validates parent relationship exists and updated_at changed.
 */
export async function test_api_task_set_parent_subtask(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join (creates account + default org)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  typia.assert(
    await api.functional.hrmPlatform.auth.member.join(memberConnection, {
      body: typia.random<IHrmPlatformMember.IJoin>(),
    }),
  );
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task (no parent_id, so it's root-level)
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { title: "Root level parent task" },
      },
    );
  typia.assert(parentTask);
  TestValidator.predicate(
    "parent task has no parent",
    parentTask.parentTask === null,
  );
  // 4. Create child task as root-level initially (no parent_id)
  const childTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { title: "Child task without parent initially" },
      },
    );
  typia.assert(childTask);
  const childCreatedAt = childTask.createdAt;
  // 5. Update child task to set parent_id = parentTask.id (one-level nesting)
  const updatedBody = {
    parentId: parentTask.id,
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedChildTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: childTask.id,
        body: updatedBody,
      },
    );
  typia.assert(updatedChildTask);
  // 6. Validate parent relationship established and updated_at changed
  TestValidator.equals(
    "child task parent reference matches parent task",
    updatedChildTask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.predicate(
    "updated_at is greater than created_at after update",
    updatedChildTask.updatedAt > childCreatedAt,
  );
  TestValidator.equals(
    "child task title preserved through update",
    updatedChildTask.title,
    "Child task without parent initially",
  );
}
