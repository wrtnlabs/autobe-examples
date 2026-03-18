import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTaskStatusHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_organizations_tasks_create } from "../../../generate/generate_random_hrms_member_organizations_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

/**
 * Test task status change history view functionality.
 *
 * Test Scenario:
 * 1. Create a member account
 * 2. Create a project within the organization
 * 3. Create a task within the project
 * 4. Change task status multiple times (open → in-progress → completed → closed)
 * 5. Query the status history endpoint
 * 6. Validate history entries contain required fields and are sorted correctly
 */
export async function test_api_task_status_history_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Get organization from authorized response
  const orgMembership = authorized.organization_memberships[0];
  typia.assert(orgMembership);
  const organization = orgMembership.organization;
  // 3. Create project (cast to entity with id)
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: "#3498db",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmsProject.ICreate,
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(project);
  const projectId = (
    project as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  // 4. Create task (cast to entity with id)
  const task = await generate_random_hrms_member_organizations_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmsTask.ICreate,
      params: {
        projectId: projectId,
      },
    },
  );
  typia.assert(task);
  const taskId = (
    task as unknown as {
      id: string & tags.Format<"uuid">;
    }
  ).id;
  // 5. Change task status multiple times to generate history entries
  // Change to in-progress
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId: projectId,
    taskId: taskId,
    body: {
      status: "in-progress",
    } satisfies IHrmsTask.IUpdate,
  });
  // Change to completed
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId: projectId,
    taskId: taskId,
    body: {
      status: "completed",
    } satisfies IHrmsTask.IUpdate,
  });
  // Change to closed
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId: projectId,
    taskId: taskId,
    body: {
      status: "closed",
    } satisfies IHrmsTask.IUpdate,
  });
  // 6. Query status history
  const historyResponse =
    await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
      memberConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          limit: 10,
        } satisfies IHrmsTaskStatusHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 7. Validate response has at least 3 history entries
  TestValidator.equals(
    "status history count",
    historyResponse.pagination.records,
    3,
  );
  TestValidator.equals("data length", historyResponse.data.length, 3);
  // 8. Validate entries are sorted by created_at descending (newest first)
  for (let i = 0; i < historyResponse.data.length - 1; i++) {
    TestValidator.predicate(
      `entry ${i} created_at >= entry ${i + 1} created_at`,
      () =>
        new Date(historyResponse.data[i].created_at) >=
        new Date(historyResponse.data[i + 1].created_at),
    );
  }
  // 9. Validate each entry has required fields
  for (const entry of historyResponse.data) {
    TestValidator.equals(
      "entry has old_status",
      typeof entry.old_status,
      "string",
    );
    TestValidator.equals(
      "entry has new_status",
      typeof entry.new_status,
      "string",
    );
    TestValidator.equals("entry has member", typeof entry.member.id, "string");
    // IHrmsTask.ISummary has project_id, project_name, task_count - NOT id
    TestValidator.equals(
      "entry has task project_id",
      typeof entry.task.project_id,
      "string",
    );
    TestValidator.equals(
      "entry has created_at",
      typeof entry.created_at,
      "string",
    );
  }
}
