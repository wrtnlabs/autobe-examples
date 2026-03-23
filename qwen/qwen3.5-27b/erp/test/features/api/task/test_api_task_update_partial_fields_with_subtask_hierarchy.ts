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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test partial update semantics and subtask hierarchy enforcement for task updates.
 *
 * This test verifies:
 * 1. Partial updates preserve unchanged fields
 * 2. Subtask hierarchy enforces one-level nesting (subtasks cannot have subtasks)
 * 3. Invalid parent assignments are rejected
 * 4. Null values are properly handled for optional fields
 */
export async function test_api_task_update_partial_fields_with_subtask_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a project
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
  // 3. Create a parent task (not a subtask)
  let parentTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Parent Task - Initial",
          description: "This is a parent task",
          status: "open",
          priority: "high",
          estimated_hours: 10,
          due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        },
      },
    );
  typia.assert(parentTask);
  // 4. Create a child task (subtask of parent)
  let childTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Child Task - Initial",
          description: "This is a subtask",
          status: "open",
          priority: "medium",
          estimated_hours: 5,
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(childTask);
  TestValidator.equals(
    "child has parent",
    childTask.parentTask?.id,
    parentTask.id,
  );
  // 5. Create another parent task for testing parent reassignment
  const anotherParentTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Another Parent Task",
          description: "Another parent for reassignment test",
          status: "open",
          priority: "low",
        },
      },
    );
  typia.assert(anotherParentTask);
  // ========== PARTIAL UPDATE TESTS ==========
  // 6. Test partial update: only title
  const updatedTitle = "Updated Title - Test 1";
  parentTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: parentTask.id,
      body: {
        title: updatedTitle,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(parentTask);
  TestValidator.equals("title updated", parentTask.title, updatedTitle);
  TestValidator.equals(
    "description preserved",
    parentTask.description,
    "This is a parent task",
  );
  TestValidator.equals("status preserved", parentTask.status, "open");
  TestValidator.equals("priority preserved", parentTask.priority, "high");
  TestValidator.equals(
    "estimated_hours preserved",
    parentTask.estimated_hours,
    10,
  );
  // 7. Test partial update: description and priority
  const newDescription = "Updated description - Test 2";
  parentTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: parentTask.id,
      body: {
        description: newDescription,
        priority: "urgent",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(parentTask);
  TestValidator.equals("title still preserved", parentTask.title, updatedTitle);
  TestValidator.equals(
    "description updated",
    parentTask.description,
    newDescription,
  );
  TestValidator.equals("priority updated", parentTask.priority, "urgent");
  TestValidator.equals("status still preserved", parentTask.status, "open");
  // ========== SUBTASK HIERARCHY TESTS ==========
  // 8. Test valid parent reassignment: child to another parent
  childTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: childTask.id,
      body: {
        parent_task_id: anotherParentTask.id,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(childTask);
  TestValidator.equals(
    "parent reassigned",
    childTask.parentTask?.id,
    anotherParentTask.id,
  );
  // 9. Test invalid parent assignment: trying to make a subtask of a subtask
  await TestValidator.error("subtask cannot have subtask", async () => {
    await api.functional.hrmPlatform.admin.tasks.update(adminConnection, {
      taskId: anotherParentTask.id,
      body: {
        parent_task_id: childTask.id, // childTask is already a subtask
      } satisfies IHrmPlatformTask.IUpdate,
    });
  });
  // 10. Test circular reference prevention: task cannot be its own parent
  await TestValidator.error("task cannot be its own parent", async () => {
    await api.functional.hrmPlatform.admin.tasks.update(adminConnection, {
      taskId: parentTask.id,
      body: {
        parent_task_id: parentTask.id,
      } satisfies IHrmPlatformTask.IUpdate,
    });
  });
  // ========== NULL VALUE HANDLING TESTS ==========
  // 11. Test setting parent_task_id to null (convert subtask to parent)
  childTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: childTask.id,
      body: {
        parent_task_id: null,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(childTask);
  TestValidator.equals("parent removed", childTask.parentTask, null);
  // 12. Test updating estimated_hours to null (remove estimate)
  parentTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: parentTask.id,
      body: {
        estimated_hours: null,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(parentTask);
  TestValidator.equals(
    "estimated_hours removed",
    parentTask.estimated_hours,
    null,
  );
  // 13. Test updating due_date to null (remove deadline)
  parentTask = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: parentTask.id,
      body: {
        due_date: null,
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(parentTask);
  TestValidator.equals("due_date removed", parentTask.due_date, null);
}
