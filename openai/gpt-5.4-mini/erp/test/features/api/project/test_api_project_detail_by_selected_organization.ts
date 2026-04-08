import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function test_api_project_detail_by_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const createdAt = new Date().toISOString();
  const projectBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    colorCode: "#12AB34",
    status: "active",
    budgetHours: 120,
    startDate: createdAt,
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IErpHrmTimeProject.ICreate;
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    { body: projectBody },
  );
  typia.assert(project);
  const detail = await api.functional.erpHrmTime.member.projects.at(
    memberConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("project id", detail.id, project.id);
  TestValidator.equals("project name", detail.name, project.name);
  TestValidator.equals(
    "project description",
    detail.description,
    project.description,
  );
  TestValidator.equals(
    "project colorCode",
    detail.colorCode,
    project.colorCode,
  );
  TestValidator.equals("project status", detail.status, project.status);
  TestValidator.equals(
    "project budgetHours",
    detail.budgetHours,
    project.budgetHours,
  );
  TestValidator.equals(
    "project startDate",
    detail.startDate,
    project.startDate,
  );
  TestValidator.equals("project endDate", detail.endDate, project.endDate);
  TestValidator.equals(
    "project createdAt",
    detail.createdAt,
    project.createdAt,
  );
  TestValidator.equals(
    "project updatedAt",
    detail.updatedAt,
    project.updatedAt,
  );
  TestValidator.equals(
    "project deletedAt",
    detail.deletedAt,
    project.deletedAt,
  );
  TestValidator.equals(
    "organization summary",
    detail.organization,
    project.organization,
  );
}
