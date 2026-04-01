import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
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

export async function test_api_project_update_status_transition_rules(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const archived = await api.functional.erpHrmTime.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: {
        name: project.name,
        description: project.description,
        colorCode: project.colorCode,
        status: "archived",
        budgetHours: project.budgetHours,
        startDate: project.startDate,
        endDate: project.endDate,
      } satisfies IErpHrmTimeProject.IUpdate,
    },
  );
  typia.assert(archived);
  TestValidator.equals("project id preserved", archived.id, project.id);
  TestValidator.equals("project status archived", archived.status, "archived");
  TestValidator.equals("project name preserved", archived.name, project.name);
  TestValidator.equals(
    "project color preserved",
    archived.colorCode,
    project.colorCode,
  );
  await TestValidator.error(
    "reject unsupported project status transition",
    async () => {
      await api.functional.erpHrmTime.member.projects.update(memberConnection, {
        projectId: project.id,
        body: {
          name: archived.name,
          description: archived.description,
          colorCode: archived.colorCode,
          status: "draft",
          budgetHours: archived.budgetHours,
          startDate: archived.startDate,
          endDate: archived.endDate,
        } satisfies IErpHrmTimeProject.IUpdate,
      });
    },
  );
  TestValidator.equals(
    "invalid transition must not change persisted status",
    archived.status,
    "archived",
  );
}
