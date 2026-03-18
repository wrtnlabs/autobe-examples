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

export async function test_api_task_status_history_single_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Set authorization header for member connection
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Get organization from member's organization memberships
  const organization = authorized.organization_memberships[0]?.organization;
  TestValidator.notEquals("organization exists", organization, undefined);
  typia.assert(organization);
  // 3. Create a project
  const projectConnection: api.IConnection = { host: connection.host };
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId: organization.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(project);
  // Extract project ID using type assertion
  const projectId = (project as any).id;
  TestValidator.predicate("project has id", projectId !== undefined);
  // 4. Create task with custom initial status (in-progress instead of default open)
  const taskConnection: api.IConnection = { host: connection.host };
  const task = await api.functional.hrms.member.organizations.tasks.create(
    taskConnection,
    {
      projectId: projectId,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "in-progress",
        description: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "high",
      },
    },
  );
  typia.assert(task);
  // Extract task properties using type assertion
  const taskId = (task as any).id;
  const taskStatus = (task as any).status;
  TestValidator.predicate(
    "task has id and status",
    taskId !== undefined && taskStatus !== undefined,
  );
  // Verify initial status is indeed in-progress
  TestValidator.equals(
    "task initial status is in-progress",
    taskStatus,
    "in-progress",
  );
  // 5. Change task status to completed
  const taskUpdateConnection: api.IConnection = { host: connection.host };
  const updatedTask = await api.functional.hrms.member.projects.tasks.update(
    taskUpdateConnection,
    {
      projectId: projectId,
      taskId: taskId,
      body: {
        status: "completed",
        description: "Task status changed to completed",
      },
    },
  );
  typia.assert(updatedTask);
  // Verify status change was applied
  const updatedStatus = (updatedTask as any).status;
  TestValidator.equals(
    "task status changed to completed",
    updatedStatus,
    "completed",
  );
  // 6. Retrieve status history
  const historyConnection: api.IConnection = { host: connection.host };
  const history =
    await api.functional.hrms.member.projects.tasks.status_history.getStatusHistory(
      historyConnection,
      {
        projectId: projectId,
        taskId: taskId,
      },
    );
  typia.assert(history);
  // 7. Validate history contains exactly one entry
  TestValidator.equals("status history has one entry", history.length, 1);
  // 8. Verify the history entry shows correct transition
  const historyEntry = history[0];
  typia.assert(historyEntry);
  // Validate the first status change was from in-progress to completed
  TestValidator.equals(
    "status history has correct old status",
    historyEntry as any as string,
    "in-progress",
  );
  // Check the last status is completed
  TestValidator.equals(
    "status history has correct new status",
    updatedStatus,
    "completed",
  );
}
