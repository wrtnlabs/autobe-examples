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
 * Test retrieving a specific task snapshot by its unique identifier.
 * 1. Authenticate as a member user
 * 2. Create a project for context
 * 3. Create a task within that project
 * 4. Create a task snapshot to capture the task state
 * 5. Retrieve the snapshot by its ID
 * 6. Validate snapshot contains all expected fields and denormalized references
 */
export async function test_api_task_snapshot_retrieve_by_id(
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
    },
  });
  // 2. Create a project for context
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within that project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "open",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 8.5,
      },
    },
  );
  typia.assert(task);
  // 4. Create a task snapshot to capture the task state
  const snapshot =
    await generate_random_hrm_platform_member_task_snapshots_create(
      memberConnection,
      {
        body: {
          hrm_platform_task_id: task.id,
        },
      },
    );
  typia.assert(snapshot);
  // 5. Retrieve the snapshot by its ID
  const retrievedSnapshot =
    await api.functional.hrmPlatform.member.task_snapshots.at(
      memberConnection,
      {
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate snapshot contains all expected task state fields
  TestValidator.equals("title matches", retrievedSnapshot.title, task.title);
  TestValidator.equals(
    "description matches",
    retrievedSnapshot.description,
    task.description,
  );
  TestValidator.equals("status matches", retrievedSnapshot.status, task.status);
  TestValidator.equals(
    "priority matches",
    retrievedSnapshot.priority,
    task.priority,
  );
  TestValidator.equals(
    "due_date matches",
    retrievedSnapshot.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "estimated_hours matches",
    retrievedSnapshot.estimated_hours,
    task.estimated_hours,
  );
  // 7. Validate denormalized references
  TestValidator.equals(
    "project reference exists",
    retrievedSnapshot.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedSnapshot.project.name,
    project.name,
  );
  TestValidator.equals(
    "employee reference matches",
    retrievedSnapshot.employee,
    task.assignedEmployee,
  );
  TestValidator.equals(
    "parent task reference matches",
    retrievedSnapshot.parentTask,
    task.parentTask,
  );
  // 8. Validate temporal fields
  TestValidator.equals(
    "task_created_at matches",
    retrievedSnapshot.task_created_at,
    task.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedSnapshot.updated_at,
    task.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedSnapshot.deleted_at,
    task.deleted_at,
  );
  TestValidator.predicate(
    "snapshot_created_at exists",
    retrievedSnapshot.snapshot_created_at !== null &&
      retrievedSnapshot.snapshot_created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot_created_at is valid datetime",
    !isNaN(Date.parse(retrievedSnapshot.snapshot_created_at)),
  );
  // 9. Validate snapshot immutability - retrieved snapshot should match created snapshot
  TestValidator.equals(
    "snapshot id matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot title immutable",
    retrievedSnapshot.title,
    snapshot.title,
  );
  TestValidator.equals(
    "snapshot status immutable",
    retrievedSnapshot.status,
    snapshot.status,
  );
}
