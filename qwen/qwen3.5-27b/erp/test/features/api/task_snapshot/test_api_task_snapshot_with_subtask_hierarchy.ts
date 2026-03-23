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
import type { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
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
import { generate_random_hrm_platform_admin_task_snapshots_create } from "../../../generate/generate_random_hrm_platform_admin_task_snapshots_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_task_snapshot } from "../../../prepare/prepare_random_hrm_platform_task_snapshot";

export async function test_api_task_snapshot_with_subtask_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create parent task (no parent_task_id)
  const parentTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "high",
        },
      },
    );
  typia.assert(parentTask);
  // 4. Create child subtask with parent_task_id
  const childSubtask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "medium",
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(childSubtask);
  // 5. Create task snapshot of the subtask
  const snapshot =
    await generate_random_hrm_platform_admin_task_snapshots_create(
      adminConnection,
      {
        body: {
          hrm_platform_task_id: childSubtask.id,
        },
      },
    );
  typia.assert(snapshot);
  // 6. Validate parentTask field is populated
  await TestValidator.predicate(
    "snapshot contains parentTask reference",
    snapshot.parentTask !== null,
  );
  // 7. Verify parentTask.id matches parent task id
  if (snapshot.parentTask !== null) {
    await TestValidator.equals(
      "parentTask.id matches parent task id",
      snapshot.parentTask.id,
      parentTask.id,
    );
    await TestValidator.equals(
      "parentTask.title matches parent task title",
      snapshot.parentTask.title,
      parentTask.title,
    );
    await TestValidator.equals(
      "parentTask.status matches parent task status",
      snapshot.parentTask.status,
      parentTask.status,
    );
    await TestValidator.equals(
      "parentTask.priority matches parent task priority",
      snapshot.parentTask.priority,
      parentTask.priority,
    );
    // 8. Verify project reference matches between parent and subtask
    await TestValidator.equals(
      "parentTask.project.id matches parent task project.id",
      snapshot.parentTask.project.id,
      parentTask.project.id,
    );
    await TestValidator.equals(
      "snapshot.project.id matches child subtask project.id",
      snapshot.project.id,
      childSubtask.project.id,
    );
    await TestValidator.equals(
      "parent and child subtask share same project",
      snapshot.parentTask.project.id,
      snapshot.project.id,
    );
    // 9. Verify parentTask contains all required fields
    await TestValidator.predicate(
      "parentTask has valid id",
      snapshot.parentTask.id.length > 0,
    );
    await TestValidator.predicate(
      "parentTask has valid title",
      snapshot.parentTask.title.length > 0,
    );
    await TestValidator.predicate(
      "parentTask has valid status",
      ["open", "in-progress", "completed", "closed"].includes(
        snapshot.parentTask.status,
      ),
    );
    await TestValidator.predicate(
      "parentTask has valid priority",
      ["low", "medium", "high", "urgent"].includes(
        snapshot.parentTask.priority,
      ),
    );
    await TestValidator.predicate(
      "parentTask has project reference",
      snapshot.parentTask.project.id.length > 0,
    );
  }
  // Verify snapshot captures subtask's own properties correctly
  await TestValidator.equals(
    "snapshot title matches subtask title",
    snapshot.title,
    childSubtask.title,
  );
  await TestValidator.equals(
    "snapshot status matches subtask status",
    snapshot.status,
    childSubtask.status,
  );
  await TestValidator.equals(
    "snapshot priority matches subtask priority",
    snapshot.priority,
    childSubtask.priority,
  );
  await TestValidator.equals(
    "snapshot project matches subtask project",
    snapshot.project.id,
    childSubtask.project.id,
  );
}
