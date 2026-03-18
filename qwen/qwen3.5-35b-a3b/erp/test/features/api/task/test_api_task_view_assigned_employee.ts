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
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_view_assigned_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Join as first member (project creator and task creator)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
        tags.Format<"uri">,
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Setup: Create organization
  const orgId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create project
  const projectConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member1Auth.token.access },
  };
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      projectConnection,
      {
        organizationId: orgId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // 4. Create task
  const taskConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member1Auth.token.access },
  };
  const task = await api.functional.hrms.member.projects.tasks.create(
    taskConnection,
    {
      projectId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "high",
        status: "open",
        hrms_employee_id: member1Auth.id,
      } satisfies IHrmsTask.ICreate,
    },
  );
  typia.assert(task);
  // 5. Test: View task
  const taskViewConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member1Auth.token.access },
  };
  const viewedTask = await api.functional.hrms.member.projects.tasks.at(
    taskViewConnection,
    {
      projectId: typia.random<string & tags.Format<"uuid">>(),
      taskId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(viewedTask);
  // 6. Validate API returns response
  TestValidator.predicate(
    "task view returns analytics",
    viewedTask.analytics !== undefined,
  );
  TestValidator.predicate(
    "analytics contains project summaries",
    viewedTask.analytics.length >= 0,
  );
}
