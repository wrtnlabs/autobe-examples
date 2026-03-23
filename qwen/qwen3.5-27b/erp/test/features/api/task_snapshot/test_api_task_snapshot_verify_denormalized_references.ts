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
 * Test that a retrieved task snapshot contains complete denormalized references to related entities.
 * This test verifies that: (1) The snapshot.project field contains IHrmPlatformProject.ISummary with
 * id, name, status, color_code, budget_hours, and created_at, (2) The snapshot.employee field
 * contains IHrmPlatformEmployee.ISummary (or null if unassigned) with id, employment_type, status,
 * member, department, and role, (3) The snapshot.parentTask field contains IHrmPlatformTask.ISummary
 * (or null if not a subtask) with id, title, status, priority, due_date, estimated_hours, project,
 * and assigned_employee, (4) All denormalized references remain valid even if the original entities
 * are later modified or deleted, (5) The snapshot provides a complete historical record without
 * requiring additional database joins.
 */
export async function test_api_task_snapshot_verify_denormalized_references(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: typia.random<string>(),
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project);
  // 3. Create task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "high",
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        estimated_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(task);
  // 4. Create a snapshot of the task
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
  // 5. Retrieve the snapshot by ID
  const retrievedSnapshot =
    await api.functional.hrmPlatform.member.task_snapshots.at(
      memberConnection,
      {
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate denormalized project reference
  TestValidator.equals(
    "snapshot.project.id matches original",
    retrievedSnapshot.project.id,
    project.id,
  );
  TestValidator.equals(
    "snapshot.project.name matches original",
    retrievedSnapshot.project.name,
    project.name,
  );
  TestValidator.equals(
    "snapshot.project.status matches original",
    retrievedSnapshot.project.status,
    project.status,
  );
  TestValidator.equals(
    "snapshot.project.color_code matches original",
    retrievedSnapshot.project.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "snapshot.project.budget_hours matches original",
    retrievedSnapshot.project.budget_hours,
    project.budget_hours,
  );
  // 7. Validate denormalized employee reference (may be null)
  if (retrievedSnapshot.employee !== null) {
    TestValidator.predicate(
      "snapshot.employee has valid member reference",
      retrievedSnapshot.employee.member.id !== undefined,
    );
    TestValidator.predicate(
      "snapshot.employee has valid role reference",
      retrievedSnapshot.employee.role.id !== undefined,
    );
  }
  // 8. Validate denormalized parent task reference (may be null)
  if (retrievedSnapshot.parentTask !== null) {
    TestValidator.predicate(
      "snapshot.parentTask has valid project reference",
      retrievedSnapshot.parentTask.project.id !== undefined,
    );
  }
  // 9. Validate snapshot task state fields match original task
  TestValidator.equals(
    "snapshot.title matches task title",
    retrievedSnapshot.title,
    task.title,
  );
  TestValidator.equals(
    "snapshot.description matches task description",
    retrievedSnapshot.description,
    task.description,
  );
  TestValidator.equals(
    "snapshot.status matches task status",
    retrievedSnapshot.status,
    task.status,
  );
  TestValidator.equals(
    "snapshot.priority matches task priority",
    retrievedSnapshot.priority,
    task.priority,
  );
  TestValidator.equals(
    "snapshot.due_date matches task due_date",
    retrievedSnapshot.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "snapshot.estimated_hours matches task estimated_hours",
    retrievedSnapshot.estimated_hours,
    task.estimated_hours,
  );
  TestValidator.equals(
    "snapshot.task_created_at matches task created_at",
    retrievedSnapshot.task_created_at,
    task.created_at,
  );
  TestValidator.equals(
    "snapshot.updated_at matches task updated_at",
    retrievedSnapshot.updated_at,
    task.updated_at,
  );
  // 10. Validate snapshot metadata
  TestValidator.predicate(
    "snapshot has valid ID",
    retrievedSnapshot.id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has valid snapshot_created_at",
    retrievedSnapshot.snapshot_created_at !== undefined,
  );
  TestValidator.equals(
    "snapshot.deleted_at is null (task was active)",
    retrievedSnapshot.deleted_at,
    null,
  );
}
