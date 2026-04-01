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

export async function test_api_project_tasks_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joinResponse = await api.functional.erpHrmTime.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: "1234",
        name: RandomGenerator.name(),
        href: "https://example.com/erp-hrm-time/join",
        referrer: "https://example.com/erp-hrm-time",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  typia.assert(joinResponse);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: `Task Browse ${RandomGenerator.name(2)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366FF",
        status: "active",
        budgetHours: null,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const requests: IErpHrmTimeTask.IRequest[] = [
    { page: 1, limit: 20 },
    { page: 1, limit: 20, sort: "dueDate", order: "asc" },
    { page: 1, limit: 20, sort: "dueDate", order: "desc" },
    { page: 1, limit: 20, sort: "priority", order: "asc" },
    { page: 1, limit: 20, sort: "priority", order: "desc" },
    { page: 1, limit: 20, sort: "createdAt", order: "asc" },
    { page: 1, limit: 20, sort: "createdAt", order: "desc" },
  ];
  for (const body of requests) {
    const response =
      await api.functional.erpHrmTime.member.projects.tasks.index(
        memberConnection,
        {
          projectId: project.id,
          body,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `task browse remains scoped to project ${project.id}`,
      () => response.data.every((task) => task.project.id === project.id),
    );
  }
}
