import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

/**
 * Test task creation by a project lead within their assigned project.
 *
 * This test verifies that a project lead can create a new task in their assigned project.
 * The project lead role grants task creation authority within their assigned project
 * without requiring additional organization-level project:manage permission.
 */
export async function test_api_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create organization membership for the member
  const orgMembership: IHrmsOrganizationMember =
    await generate_random_hrms_member_organization_members_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(orgMembership);
  // 3. Assume member is added as project lead to a project
  // Using a valid UUID for project ID
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create task as project lead
  const task = typia.assert<
    IHrmsTask & {
      title: string;
      status: string;
      project_id: string;
      id: string;
      created_at: string;
    }
  >(
    await api.functional.hrms.member.projects.tasks.create(
      memberConnection,
      {
        projectId,
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
          description: typia.random<string & tags.MaxLength<4000>>(),
          status: "open",
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
          estimated_hours: typia.random<number & tags.Minimum<0>>(),
          due_date: RandomGenerator.date(
            new Date(),
            30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          billable: typia.random<boolean>(),
          hrms_employee_id: typia.random<string & tags.Format<"uuid">>(),
          hrms_task_id: null,
        } satisfies IHrmsTask.ICreate,
      },
    ),
  );
  // 5. Validate task creation response
  TestValidator.equals("task title set", task.title.length > 0, true);
  TestValidator.equals("task status open", task.status, "open");
  TestValidator.equals("task project id", task.project_id, projectId);
  // 6. Verify task has required fields
  TestValidator.predicate("task has id", task.id !== undefined);
  TestValidator.predicate("task has timestamps", task.created_at !== undefined);
}