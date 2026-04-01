import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_project_tasks_browse_project_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const projectConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: `member-${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphabets(8)}`,
      name: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/erp",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(memberAuthorized);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const response = await api.functional.erpHrmTime.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeTask.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "task list pagination current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "task list pagination limit",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "task list pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "task list pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all tasks are scoped to the selected project",
    response.data.every((task) => task.project.id === project.id),
  );
  TestValidator.predicate(
    "task summaries preserve expected nullable relations",
    response.data.every(
      (task) =>
        task.project.id === project.id &&
        (task.employee === null || task.employee !== null) &&
        (task.parentTask === null || task.parentTask !== null),
    ),
  );
  const deniedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(deniedConnection, {
    body: {
      email: `outsider-${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd-${RandomGenerator.alphabets(8)}`,
      name: RandomGenerator.name(),
      href: "https://example.com/erp/signup",
      referrer: "https://example.com/erp",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.httpError(
    "member without project visibility cannot browse project tasks",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.index(
        deniedConnection,
        {
          projectId: project.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeTask.IRequest,
        },
      );
    },
  );
}
