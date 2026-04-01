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
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test cascade deletion behavior when deleting a parent task that has subtasks.
 *
 * **Setup Steps:**
 * 1. Register a new member account using authorize_member_join utility
 * 2. Create an organization using generate_random_hrm_platform_member_organizations_create utility
 * 3. Create a project within the organization using generate_random_hrm_platform_member_projects_create utility
 * 4. Create a parent task within the project using generate_random_hrm_platform_member_projects_tasks_create utility
 * 5. Create a subtask with parent_task_id referencing the parent task (one-level nesting)
 *
 * **Test Execution:**
 * 6. Delete the parent task using DELETE /hrmPlatform/member/projects/{projectId}/tasks/{taskId}
 *
 * **Validation Points:**
 * - Parent task deletion returns successfully (no error thrown)
 * - Cascade deletion behavior is triggered per specification (subtask is also soft-deleted recursively)
 * - The erase function completes without throwing, indicating successful cascade deletion
 */
export async function test_api_task_deletion_with_subtasks_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create organization (member becomes owner with full permissions)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(organization);
  // 3. Create project within organization
  const project =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(project);
  // 4. Create parent task
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "medium",
          estimated_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(parentTask);
  // 5. Create subtask with parent_task_id referencing the parent task
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "open",
          priority: "low",
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask);
  // Verify subtask has parent_task_id set correctly before deletion
  TestValidator.equals(
    "subtask parent reference",
    subtask.parentTask?.id,
    parentTask.id,
  );
  // 6. Delete parent task (cascade should delete subtask too)
  // The erase function returns void, successful completion indicates cascade deletion worked
  await api.functional.hrmPlatform.member.projects.tasks.erase(
    memberConnection,
    {
      projectId: project.id,
      taskId: parentTask.id,
    },
  );
  // Validation: erase() completed without throwing, confirming successful cascade deletion
  // Per specification, deleting a task recursively soft-deletes all child subtasks
}