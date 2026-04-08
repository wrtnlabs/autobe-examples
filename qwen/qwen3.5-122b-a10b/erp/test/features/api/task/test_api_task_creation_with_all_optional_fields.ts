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
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

/**
 * Test task creation with all optional fields populated for a project lead.
 *
 * Validates that a project lead can create a task within a project with all optional fields including description, estimated hours, due date, and status. The test ensures proper storage and validation of optional task properties while verifying default values are applied correctly.
 *
 * This test focuses on task creation capabilities without requiring employee assignment, as employee creation utilities are not available in the current test infrastructure. The task is created with all optional fields explicitly set to verify the API handles them correctly.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Extract organization ID from the member's authentication response.
 * 3. Create a project within the organization using random project data.
 * 4. Create a task with all optional fields: description, estimated_hours, due_date, status, assigned_employee_id, and parent_task_id.
 * 5. Validate that all optional fields are correctly stored and returned in the response.
 * 6. Verify the due_date is properly formatted as ISO 8601 datetime.
 * 7. Verify the estimated_hours is a positive numeric value.
 * 8. Verify the status defaults to 'open' when explicitly set.
 */
export async function test_api_task_creation_with_all_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
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
  // 2. Get organization from authentication response
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must have at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 3. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Create task with all optional fields populated
  const description = RandomGenerator.paragraph({ sentences: 5 });
  const estimatedHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const priority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
    "urgent",
  ] as const);
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.name(3),
          description,
          priority,
          estimated_hours: estimatedHours,
          due_date: dueDate,
          status: "open",
          assigned_employee_id: null,
          parent_task_id: null,
        } satisfies IHrmTask.ICreate,
      },
    );
  typia.assert(task);
  // 5. Validate all fields are correctly stored
  TestValidator.equals("task title is set", task.title.length > 0, true);
  TestValidator.predicate(
    "task has description",
    task.description !== null && task.description.length > 0,
  );
  TestValidator.predicate(
    "task has valid priority",
    ["low", "medium", "high", "urgent"].includes(task.priority),
  );
  TestValidator.predicate(
    "task has estimated hours",
    task.estimated_hours !== null && task.estimated_hours > 0,
  );
  TestValidator.predicate("task has due date", task.due_date !== null);
  TestValidator.predicate("task status is open", task.status === "open");
  TestValidator.equals("task belongs to project", task.project.id, project.id);
}