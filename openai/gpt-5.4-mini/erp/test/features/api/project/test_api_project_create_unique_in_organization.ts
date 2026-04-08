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

export async function test_api_project_create_unique_in_organization(
  connection: api.IConnection,
): Promise<void> {
  const password = "Password123!";
  const projectName = `Project ${RandomGenerator.alphabets(10)}`;
  const organizationAConnection: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(organizationAConnection, {
    body: {
      email: `owner_${RandomGenerator.alphabets(8)}@test.com`,
      password,
      displayName: RandomGenerator.name(),
      href: `https://example.com/onboarding/${RandomGenerator.alphabets(6)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorizedA);
  const memberConnectionA: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedA.token.access },
  };
  const createBody = {
    name: projectName,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    colorCode: "#4F46E5",
    status: "active",
    budgetHours: 120,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
  } satisfies IErpHrmTimeProject.ICreate;
  const createdProject = await api.functional.erpHrmTime.member.projects.create(
    memberConnectionA,
    { body: createBody },
  );
  typia.assert(createdProject);
  TestValidator.equals(
    "project name preserved",
    createdProject.name,
    projectName,
  );
  TestValidator.equals(
    "project description preserved",
    createdProject.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "project color preserved",
    createdProject.colorCode,
    createBody.colorCode,
  );
  TestValidator.equals(
    "project status preserved",
    createdProject.status,
    createBody.status,
  );
  TestValidator.equals(
    "project budget preserved",
    createdProject.budgetHours,
    createBody.budgetHours ?? null,
  );
  TestValidator.equals(
    "project start date preserved",
    createdProject.startDate,
    createBody.startDate ?? null,
  );
  TestValidator.equals(
    "project end date preserved",
    createdProject.endDate,
    createBody.endDate ?? null,
  );
  TestValidator.predicate("project id exists", createdProject.id.length > 0);
  TestValidator.predicate(
    "project createdAt exists",
    createdProject.createdAt.length > 0,
  );
  TestValidator.predicate(
    "project updatedAt exists",
    createdProject.updatedAt.length > 0,
  );
  TestValidator.equals("project not deleted", createdProject.deletedAt, null);
  await TestValidator.error(
    "duplicate project name in same organization should fail",
    async () => {
      await api.functional.erpHrmTime.member.projects.create(
        memberConnectionA,
        {
          body: {
            name: projectName,
            description: RandomGenerator.paragraph({ sentences: 1 }),
            colorCode: "#22C55E",
            status: "active",
          } satisfies IErpHrmTimeProject.ICreate,
        },
      );
    },
  );
  const organizationBConnection: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(organizationBConnection, {
    body: {
      email: `other_${RandomGenerator.alphabets(8)}@test.com`,
      password,
      displayName: RandomGenerator.name(),
      href: `https://example.com/onboarding/${RandomGenerator.alphabets(6)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorizedB);
  const memberConnectionB: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedB.token.access },
  };
  const crossOrgProject =
    await api.functional.erpHrmTime.member.projects.create(memberConnectionB, {
      body: {
        name: projectName,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        colorCode: "#EF4444",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(crossOrgProject);
  TestValidator.equals(
    "same project name allowed in different organization",
    crossOrgProject.name,
    projectName,
  );
  TestValidator.notEquals(
    "different organization creates distinct project id",
    crossOrgProject.id,
    createdProject.id,
  );
}
