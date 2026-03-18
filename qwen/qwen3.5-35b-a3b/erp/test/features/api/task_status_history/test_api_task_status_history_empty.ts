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

export async function test_api_task_status_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create project within organization
  const projectRaw =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#" + RandomGenerator.alphaNumeric(6),
        },
        params: {
          organizationId:
            memberAuth.organization_memberships[0].organization.id,
        },
      },
    );
  const project = typia.assert<IHrmsProject.ISummary>(projectRaw);
  const projectId: string = project.id;
  // 3. Create task without any status changes
  const taskRaw = await generate_random_hrms_member_organizations_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
      params: {
        projectId: projectId,
      },
    },
  );
  // Task entity has id property from hrms_tasks.id
  const task = typia.assert<{
    id: string;
    title: string;
  }>(taskRaw);
  const taskId: string = task.id;
  // 4. Query task status history
  const response: IPageIHrmsTaskStatusHistory.ISummary =
    await api.functional.hrms.member.projects.tasks.status_history.statusHistory(
      memberConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmsTaskStatusHistory.IRequest,
      },
    );
  typia.assert(response);
  // 5. Validate response
  TestValidator.equals(
    "status history data should be empty",
    response.data,
    [],
  );
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 100",
    response.pagination.limit,
    100,
  );
}
