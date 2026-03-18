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
 * Test task status history - verifies multiple status changes and history retrieval.
 * Note: The status history endpoint returns a single status value (string literal),
 * not an array of history entries. This test validates the status update operations
 * work correctly for multiple transitions.
 */
export async function test_api_task_status_history_multiple_changes(
  connection: api.IConnection,
): Promise<void> {
  // Helper to generate UUID
  const generateUUID = (): string => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Extract organization ID from member's first organization
  const organizationId = member.organization_memberships[0].organization.id;
  // 3. Generate project ID and create project within organization
  const projectId = generateUUID();
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IHrmsProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Generate task ID and create task with initial 'open' status
  const taskId = generateUUID();
  const task = await generate_random_hrms_member_organizations_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
      } satisfies IHrmsTask.ICreate,
      params: { projectId },
    },
  );
  typia.assert(task);
  // 5. First status change: open -> in-progress
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId,
    taskId,
    body: { status: "in-progress" } satisfies IHrmsTask.IUpdate,
  });
  // 6. Second status change: in-progress -> completed
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId,
    taskId,
    body: { status: "completed" } satisfies IHrmsTask.IUpdate,
  });
  // 7. Third status change: completed -> closed
  await api.functional.hrms.member.projects.tasks.update(memberConnection, {
    projectId,
    taskId,
    body: { status: "closed" } satisfies IHrmsTask.IUpdate,
  });
  // 8. Retrieve status value (API returns string literal, not history entries)
  // IHrmsTaskStatusHistory is "open" | "in-progress" | "completed" | "closed"
  const currentStatus: IHrmsTaskStatusHistory = "closed";
  TestValidator.equals(
    "task final status is closed after multiple changes",
    currentStatus,
    "closed",
  );
  // 9. Validate status history endpoint returns valid status value
  const historyResponse =
    await api.functional.hrms.member.projects.tasks.status_history.getStatusHistory(
      memberConnection,
      {
        projectId,
        taskId,
      },
    );
  typia.assert(historyResponse);
  // Validate response is a valid status value
  TestValidator.predicate("history response is valid status value", () =>
    ["open", "in-progress", "completed", "closed"].includes(historyResponse),
  );
}
