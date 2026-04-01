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
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";

export async function test_api_project_create_organization_scope_and_permission(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Aa!!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const firstOrganization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}-1`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  const secondOrganization =
    await generate_random_erp_hrm_time_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}-2`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  const firstProject =
    await generate_random_erp_hrm_time_member_projects_create(ownerConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}-a`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(firstProject);
  const secondProject =
    await generate_random_erp_hrm_time_member_projects_create(ownerConnection, {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}-b`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        colorCode: "#ff6633",
        status: "active",
        budgetHours: 80,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(secondProject);
  TestValidator.notEquals(
    "projects should be distinct",
    firstProject.id,
    secondProject.id,
  );
  TestValidator.notEquals(
    "organizations should be distinct",
    firstOrganization.id,
    secondOrganization.id,
  );
  const limitedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(limitedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Aa!!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.httpError(
    "member without project permission cannot create project",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.projects.create(
        limitedConnection,
        {
          body: {
            name: `project-${RandomGenerator.alphabets(8)}-denied`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            colorCode: "#11aa11",
            status: "active",
            budgetHours: 40,
            startDate: new Date().toISOString(),
            endDate: null,
          } satisfies IErpHrmTimeProject.ICreate,
        },
      );
    },
  );
}
