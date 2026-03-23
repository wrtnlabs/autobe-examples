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
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_task_snapshots_create } from "../../../generate/generate_random_hrm_platform_member_task_snapshots_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_task_snapshot } from "../../../prepare/prepare_random_hrm_platform_task_snapshot";

/**
 * Test creating a task snapshot for a subtask to validate that the parent task relationship is correctly captured and denormalized in the snapshot.
 *
 * This test verifies:
 * 1. Subtask creation with parent task reference
 * 2. Task snapshot creation for subtask
 * 3. Parent task relationship is correctly denormalized in the snapshot
 * 4. All subtask fields are captured in the snapshot
 */
export async function test_api_task_snapshot_subtask_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project (prerequisite for tasks)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a parent task within the project (no parent_task_id)
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "open",
          priority: "high",
          due_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          estimated_hours: typia.random<number & tags.Type<"uint32">>(),
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(parentTask);
  // 4. Create a subtask within the same project with the parent task ID
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          status: "open",
          priority: "medium",
          due_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          estimated_hours: typia.random<number & tags.Type<"uint32">>(),
          parent_task_id: parentTask.id,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(subtask);
  // 5. Verify the subtask is successfully created with parent task reference
  TestValidator.equals(
    "subtask has parent task ID",
    subtask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.predicate(
    "subtask parent task exists",
    subtask.parentTask !== null,
  );
  // 6. Call the task snapshot creation endpoint with the subtask ID
  const snapshot =
    await generate_random_hrm_platform_member_task_snapshots_create(
      memberConnection,
      {
        body: {
          hrm_platform_task_id: subtask.id,
        } satisfies IHrmPlatformTaskSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  // 7. Verify the snapshot contains a snapshot with the parent task reference
  TestValidator.predicate(
    "snapshot has parent task reference",
    snapshot.parentTask !== null,
  );
  // 8. Verify the snapshot captures the parent task's summary information
  TestValidator.equals(
    "snapshot parent task ID matches",
    snapshot.parentTask?.id,
    parentTask.id,
  );
  TestValidator.equals(
    "snapshot parent task title matches",
    snapshot.parentTask?.title,
    parentTask.title,
  );
  TestValidator.equals(
    "snapshot parent task status matches",
    snapshot.parentTask?.status,
    parentTask.status,
  );
  TestValidator.equals(
    "snapshot parent task priority matches",
    snapshot.parentTask?.priority,
    parentTask.priority,
  );
  TestValidator.equals(
    "snapshot parent task due date matches",
    snapshot.parentTask?.due_date,
    parentTask.due_date,
  );
  TestValidator.equals(
    "snapshot parent task estimated hours matches",
    snapshot.parentTask?.estimated_hours,
    parentTask.estimated_hours,
  );
  TestValidator.equals(
    "snapshot parent task project ID matches",
    snapshot.parentTask?.project.id,
    project.id,
  );
  // 9. Verify the snapshot correctly represents the subtask state
  TestValidator.equals(
    "snapshot title matches subtask",
    snapshot.title,
    subtask.title,
  );
  TestValidator.equals(
    "snapshot description matches subtask",
    snapshot.description,
    subtask.description,
  );
  TestValidator.equals(
    "snapshot status matches subtask",
    snapshot.status,
    subtask.status,
  );
  TestValidator.equals(
    "snapshot priority matches subtask",
    snapshot.priority,
    subtask.priority,
  );
  TestValidator.equals(
    "snapshot due date matches subtask",
    snapshot.due_date,
    subtask.due_date,
  );
  TestValidator.equals(
    "snapshot estimated hours matches subtask",
    snapshot.estimated_hours,
    subtask.estimated_hours,
  );
  TestValidator.equals(
    "snapshot project ID matches subtask",
    snapshot.project.id,
    project.id,
  );
}
